// ChoreEdit — minimal parent-facing builder for "home chore" hunts.
// Streamlined fields (no GPS, no AI, no sources) → saves as visibility=family_private + status=published.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Save, House, Camera, Mic, CheckSquare } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import type { HuntStop, HuntPromptKind } from '@/types/hunt';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const COVER_OPTIONS = ['🏠', '🧹', '🪥', '🍳', '🐶', '🪴', '👕', '📚', '🛏️', '🧸', '🎨', '⭐'];

const SIMPLE_KINDS: { value: HuntPromptKind; label: string; icon: typeof Camera; helper: string }[] = [
  { value: 'observation',  label: 'Just tap done',  icon: CheckSquare, helper: 'Kid taps "Done" — no proof needed.' },
  { value: 'photo',        label: 'Take a photo',   icon: Camera,      helper: 'Kid takes a photo as proof (made bed, clean room, etc.).' },
  { value: 'voice_answer', label: 'Speak answer',   icon: Mic,         helper: 'Kid says the answer — speech-to-text matches your list.' },
];

interface ChoreStopDraft {
  id?: string;
  title: string;
  promptKind: HuntPromptKind;
  question: string;
  correctAnswers: string;   // comma-separated for voice_answer
  photoSubject: string;     // for photo
  funFact: string;          // praise message
  expanded: boolean;
}

function emptyStop(order: number): ChoreStopDraft {
  return {
    id: crypto.randomUUID(),
    title: order === 0 ? 'Make your bed' : `Chore ${order + 1}`,
    promptKind: 'observation',
    question: 'Did you do this chore?',
    correctAnswers: '',
    photoSubject: '',
    funFact: 'Well done — you rock! 🌟',
    expanded: order === 0,
  };
}

function slugify(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || `chores-${Date.now()}`;
}

export default function ChoreEdit() {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const isEditing = !!routeSlug;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving]   = useState(false);
  const [optimisticSaving, setOptimisticSaving] = useState(false);
  const [huntId, setHuntId]   = useState<string | null>(null);

  const [title, setTitle]           = useState('Sunday tidy-up');
  const [blurb, setBlurb]           = useState('Quick chore quest around the house — earn a stamp for each one!');
  const [coverEmoji, setCoverEmoji] = useState('🏠');
  const [stops, setStops]           = useState<ChoreStopDraft[]>([emptyStop(0)]);
  const originalStopsRef = useRef<HuntStop[]>([]);

  // Load existing chore-hunt if editing
  useEffect(() => {
    if (!isEditing || !routeSlug) return;
    (async () => {
      const h = await huntsService.getHunt(routeSlug);
      if (!h) { toast.error('Chore city game not found'); navigate('/chores'); return; }
      setHuntId(h.id);
      originalStopsRef.current = h.stops ?? [];
      setTitle(h.title);
      setBlurb(h.blurb);
      setCoverEmoji(h.coverEmoji);
      setStops(h.stops.map((s, i) => ({
        id: s.id,
        title: s.title,
        promptKind: s.prompt.kind,
        question: s.prompt.question,
        correctAnswers: (s.prompt.correctAnswers ?? []).join(', '),
        photoSubject: s.prompt.photoSubject ?? '',
        funFact: s.reveal.funFact,
        expanded: i === 0,
      })));
      setLoading(false);
    })();
  }, [isEditing, routeSlug, navigate]);

  const addStop    = () => setStops(prev => [...prev, emptyStop(prev.length)]);
  const removeStop = (i: number) => setStops(prev => prev.filter((_, j) => j !== i));
  const updateStop = (i: number, patch: Partial<ChoreStopDraft>) =>
    setStops(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));
  const toggleStop = (i: number) =>
    setStops(prev => prev.map((s, j) => j === i ? { ...s, expanded: !s.expanded } : s));

  const validate = (): string | null => {
    if (!title.trim()) return 'City game title required';
    if (stops.length === 0) return 'Add at least one chore';
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.title.trim()) return `Chore ${i + 1}: title required`;
      if (!s.question.trim()) return `Chore ${i + 1}: question required`;
      if (!s.funFact.trim()) return `Chore ${i + 1}: praise message required`;
      if (s.promptKind === 'voice_answer' && !s.correctAnswers.trim())
        return `Chore ${i + 1}: voice answer needs at least one acceptable answer`;
    }
    return null;
  };

  const handleSave = async () => {
    if (saving || optimisticSaving) return;
    const err = validate();
    if (err) { toast.error(err); return; }
    if (isEditing && huntId) {
      setOptimisticSaving(true);
      toast.success('Saved ✓', { description: 'Syncing in the background…' });
    } else {
      setSaving(true);
    }
    try {
      // Build HuntStop list
      const huntStops: HuntStop[] = stops.map((s, i) => ({
        id: s.id ?? `tmp-${i}`,
        order: i,
        title: s.title.trim(),
        // No GPS — kids are at home; HuntPlay's "I'm here" button still works without coords
        lat: 0,
        lon: 0,
        clueText: s.question.trim(),
        prompt: {
          kind: s.promptKind,
          question: s.question.trim(),
          correctAnswers: s.promptKind === 'voice_answer'
            ? s.correctAnswers.split(',').map(x => x.trim()).filter(Boolean)
            : undefined,
          photoSubject: s.promptKind === 'photo' ? s.photoSubject.trim() || undefined : undefined,
        },
        reveal: { funFact: s.funFact.trim() },
      }));

      let id = huntId;
      if (!id) {
        // Create new chore hunt
        id = await huntsService.createDraft({
          slug: slugify(title) + '-' + Math.random().toString(36).slice(2, 6),
          title: title.trim(),
          blurb: blurb.trim() || 'Home chore quest',
          hostName: 'Family',
          city: 'Home',
          countryCode: 'US',
          coverEmoji,
          primaryTheme: 'community',
          ageMin: 4,
          ageMax: 14,
          durationMinutes: Math.max(5, stops.length * 5),
          difficulty: 'easy',
          createdVia: 'human',
          visibility: 'family_private',
        });
        setHuntId(id);
      } else {
        await huntsService.updateHunt(id, {
          title: title.trim(),
          blurb: blurb.trim() || 'Home chore quest',
          coverEmoji,
          durationMinutes: Math.max(5, stops.length * 5),
        });
      }
      await huntsService.saveStopsDiff(id, originalStopsRef.current, huntStops);
      originalStopsRef.current = huntStops.map((stop, order) => ({ ...stop, order }));
      if (!isEditing) toast.success('Chore city game created!');
      navigate('/chores');
    } catch (e: any) {
      console.error('[ChoreEdit] save', e);
      toast.error(
        isEditing ? 'Save failed — please retry.' : (e?.message || 'Save failed'),
        isEditing ? { description: e?.message } : undefined,
      );
    } finally {
      setSaving(false);
      setOptimisticSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
      >
        <button onClick={() => navigate('/chores')} className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black flex-1 truncate">
          {isEditing ? 'Edit chore city game' : 'New chore city game'}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* City game basics */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Sunday tidy-up"
              className="mt-1 w-full h-11 rounded-xl border border-border px-3 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Description (optional)</label>
            <textarea
              value={blurb}
              onChange={e => setBlurb(e.target.value)}
              rows={2}
              placeholder="Why this city game matters — written for the kid"
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cover emoji</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COVER_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => setCoverEmoji(e)}
                  className={cn(
                    'w-10 h-10 rounded-xl text-2xl flex items-center justify-center tap-highlight active:scale-95 transition-transform',
                    coverEmoji === e ? 'bg-primary/15 ring-2 ring-primary' : 'bg-muted/50 hover:bg-muted',
                  )}
                  aria-label={`Cover ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stops */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Chores ({stops.length})</p>
          </div>

          {stops.map((s, i) => {
            const KindIcon = (SIMPLE_KINDS.find(k => k.value === s.promptKind)?.icon ?? CheckSquare);
            return (
              <div key={s.id ?? i} className="rounded-2xl border bg-card overflow-hidden">
                <button
                  onClick={() => toggleStop(i)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left tap-highlight"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.title || `Chore ${i + 1}`}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <KindIcon className="w-3 h-3" />
                      {SIMPLE_KINDS.find(k => k.value === s.promptKind)?.label ?? 'Other'}
                    </p>
                  </div>
                  {s.expanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>

                {s.expanded && (
                  <div className="border-t p-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chore name</label>
                      <input
                        value={s.title}
                        onChange={e => updateStop(i, { title: e.target.value })}
                        placeholder="Make your bed"
                        className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">How does the kid prove it?</label>
                      <div className="mt-1 grid grid-cols-3 gap-1.5">
                        {SIMPLE_KINDS.map(k => {
                          const Icon = k.icon;
                          return (
                            <button
                              key={k.value}
                              onClick={() => updateStop(i, { promptKind: k.value })}
                              className={cn(
                                'rounded-xl border-2 p-2 flex flex-col items-center gap-1 text-center tap-highlight active:scale-[0.98] transition-transform',
                                s.promptKind === k.value ? 'border-primary bg-primary/8' : 'border-border bg-background',
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[10px] font-bold leading-tight">{k.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                        {SIMPLE_KINDS.find(k => k.value === s.promptKind)?.helper}
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Question / instruction</label>
                      <input
                        value={s.question}
                        onChange={e => updateStop(i, { question: e.target.value })}
                        placeholder="Did you make your bed?"
                        className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    {s.promptKind === 'voice_answer' && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acceptable spoken answers</label>
                        <input
                          value={s.correctAnswers}
                          onChange={e => updateStop(i, { correctAnswers: e.target.value })}
                          placeholder="yes, done, all done, finished"
                          className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Comma-separated. Speech-to-text varies — include common variations.</p>
                      </div>
                    )}

                    {s.promptKind === 'photo' && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What should the photo show?</label>
                        <input
                          value={s.photoSubject}
                          onChange={e => updateStop(i, { photoSubject: e.target.value })}
                          placeholder="Bed, sheets pulled flat"
                          className="mt-1 w-full h-10 rounded-lg border border-border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Praise / reveal message</label>
                      <textarea
                        value={s.funFact}
                        onChange={e => updateStop(i, { funFact: e.target.value })}
                        rows={2}
                        placeholder="Awesome — your room looks amazing!"
                        className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Shown after the chore — make it warm and specific.</p>
                    </div>

                    {stops.length > 1 && (
                      <button
                        onClick={() => removeStop(i)}
                        className="w-full h-9 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold tap-highlight flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" /> Remove this chore
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addStop}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground tap-highlight"
          >
            <Plus className="w-4 h-4" /> Add another chore
          </button>
        </div>
      </div>

      {/* Sticky save bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-3 flex items-center gap-2"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-1">
          <House className="w-3 h-3 text-amber-700" />
          Family-private — only you and your kids see this
        </div>
        <button
          onClick={handleSave}
          disabled={saving || optimisticSaving}
          className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold tap-highlight active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {optimisticSaving ? 'Saved ✓' : saving ? 'Creating…' : isEditing ? 'Save changes' : 'Create city game'}
        </button>
      </div>
    </div>
  );
}
