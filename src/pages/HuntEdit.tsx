/**
 * HuntEdit — shared hunt builder used by both /org/hunts/:id and /admin/hunts/:id
 * (and their /new variants for creation). Capability-scoped via path.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Send, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { huntsService } from '@/services/huntsService';
import type { ScavengerHunt, HuntStop, HuntPromptKind, HuntSponsor } from '@/types/hunt';
import { authService } from '@/services';
import { cn } from '@/lib/utils';

type Mode = 'org' | 'admin';

const PROMPT_KINDS: { value: HuntPromptKind; label: string; helper: string }[] = [
  { value: 'text',            label: '📝 Text',         helper: 'Player types an answer (case-insensitive contains-match against your list).' },
  { value: 'multiple_choice', label: '🔘 Multiple choice', helper: 'Player picks one of the options. Mark which is correct.' },
  { value: 'photo',           label: '📷 Photo',        helper: 'Player takes a photo of the subject — always accepted.' },
  { value: 'observation',     label: '👀 Observation',  helper: 'No answer required. Player just acknowledges they did the thing.' },
];

function emptyStop(order: number): HuntStop {
  return {
    id: crypto.randomUUID(),
    order,
    title: '',
    lat: 0,
    lon: 0,
    address: '',
    clueText: '',
    prompt: { kind: 'text', question: '', correctAnswers: [] },
    reveal: { funFact: '' },
  };
}

export default function HuntEdit() {
  const params = useParams<{ id?: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode: Mode = pathname.startsWith('/admin/') ? 'admin' : 'org';
  const isNew = !params.id || params.id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [huntStatus, setHuntStatus] = useState<string>('draft');
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [hunt, setHunt] = useState<Partial<ScavengerHunt>>({
    slug: '',
    title: '',
    blurb: '',
    coverEmoji: '🔍',
    hostName: '',
    city: '',
    countryCode: 'US',
    primaryTheme: 'history',
    ageMin: 6,
    ageMax: 14,
    durationMinutes: 120,
    difficulty: 'easy',
    credits: '',
    stops: [],
    sponsors: [],
  });
  const [huntId, setHuntId] = useState<string | null>(isNew ? null : (params.id ?? null));
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null); // sponsor index being uploaded for

  // Load existing hunt
  useEffect(() => {
    if (isNew || !params.id) return;
    (async () => {
      const h = await huntsService.getHuntById(params.id!);
      if (!h) { toast.error('Hunt not found'); navigate(mode === 'admin' ? '/admin/hunts' : '/org/hunts'); return; }
      setHunt(h);
      setHuntStatus(h.status);
      setReviewNotes(h.reviewNotes);
      setHuntId(h.id);
      setLoading(false);
    })();
  }, [params.id, isNew, mode, navigate]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateField = <K extends keyof ScavengerHunt>(k: K, v: ScavengerHunt[K]) => {
    setHunt(prev => ({ ...prev, [k]: v }));
  };

  const updateStop = (idx: number, mut: (s: HuntStop) => HuntStop) => {
    setHunt(prev => ({
      ...prev,
      stops: (prev.stops ?? []).map((s, i) => i === idx ? mut(s) : s),
    }));
  };

  const addStop = () => {
    setHunt(prev => ({ ...prev, stops: [...(prev.stops ?? []), emptyStop((prev.stops ?? []).length)] }));
  };

  const removeStop = (idx: number) => {
    setHunt(prev => ({ ...prev, stops: (prev.stops ?? []).filter((_, i) => i !== idx) }));
  };

  const moveStop = (idx: number, dir: 'up' | 'down') => {
    setHunt(prev => {
      const stops = [...(prev.stops ?? [])];
      const swap = dir === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= stops.length) return prev;
      [stops[idx], stops[swap]] = [stops[swap], stops[idx]];
      return { ...prev, stops };
    });
  };

  const updateSponsor = (idx: number, mut: (s: HuntSponsor) => HuntSponsor) => {
    setHunt(prev => ({ ...prev, sponsors: (prev.sponsors ?? []).map((s, i) => i === idx ? mut(s) : s) }));
  };
  const addSponsor = () => setHunt(prev => ({ ...prev, sponsors: [...(prev.sponsors ?? []), { name: '' }] }));
  const removeSponsor = (idx: number) => setHunt(prev => ({ ...prev, sponsors: (prev.sponsors ?? []).filter((_, i) => i !== idx) }));

  // ── Save / submit / approve ────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!hunt.slug?.trim()) return 'Slug is required';
    if (!hunt.title?.trim()) return 'Title is required';
    if (!hunt.blurb?.trim()) return 'Blurb is required';
    if (!hunt.hostName?.trim()) return 'Host name is required';
    if (!hunt.city?.trim()) return 'City is required';
    if (!(hunt.stops?.length)) return 'Add at least one stop';
    for (const [i, s] of (hunt.stops ?? []).entries()) {
      if (!s.title.trim()) return `Stop ${i + 1}: title required`;
      if (!s.clueText.trim()) return `Stop ${i + 1}: clue required`;
      if (!s.prompt.question.trim()) return `Stop ${i + 1}: question required`;
      if (!s.reveal.funFact.trim()) return `Stop ${i + 1}: reveal / fun fact required`;
      if (s.prompt.kind === 'multiple_choice' && (!s.prompt.options?.length || !s.prompt.correctAnswers?.length)) {
        return `Stop ${i + 1}: multiple choice needs options and a correct answer`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      let id = huntId;
      if (!id) {
        id = await huntsService.createDraft({
          slug: hunt.slug!, title: hunt.title!, blurb: hunt.blurb!,
          hostName: hunt.hostName!, city: hunt.city!, countryCode: hunt.countryCode,
          coverEmoji: hunt.coverEmoji, primaryTheme: hunt.primaryTheme,
          ageMin: hunt.ageMin, ageMax: hunt.ageMax,
          durationMinutes: hunt.durationMinutes, difficulty: hunt.difficulty as any,
          credits: hunt.credits,
        });
        setHuntId(id);
      } else {
        await huntsService.updateHunt(id, {
          slug: hunt.slug, title: hunt.title, blurb: hunt.blurb,
          hostName: hunt.hostName, city: hunt.city, countryCode: hunt.countryCode,
          coverEmoji: hunt.coverEmoji, primaryTheme: hunt.primaryTheme,
          ageMin: hunt.ageMin, ageMax: hunt.ageMax,
          durationMinutes: hunt.durationMinutes, difficulty: hunt.difficulty,
          credits: hunt.credits,
        });
      }
      await huntsService.replaceStops(id, hunt.stops ?? []);
      await huntsService.replaceSponsors(id, hunt.sponsors ?? []);
      toast.success('Saved');
      // Update URL if we just created
      if (isNew) {
        const target = mode === 'admin' ? `/admin/hunts/${id}` : `/org/hunts/${id}`;
        navigate(target, { replace: true });
      }
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!huntId) { toast.error('Save the hunt first'); return; }
    try {
      await huntsService.submitForReview(huntId);
      setHuntStatus('pending_review');
      toast.success('Submitted for review');
    } catch (e: any) { toast.error(e.message || 'Submit failed'); }
  };

  const handleApprove = async () => {
    if (!huntId) return;
    const user = await authService.getCurrentUser();
    if (!user) return;
    try {
      await huntsService.approve(huntId, user.id);
      setHuntStatus('published');
      toast.success('Hunt approved & published');
    } catch (e: any) { toast.error(e.message || 'Approve failed'); }
  };

  const handleReject = async () => {
    if (!huntId) return;
    const notes = window.prompt('Reason for rejection (visible to author):');
    if (!notes) return;
    const user = await authService.getCurrentUser();
    if (!user) return;
    try {
      await huntsService.reject(huntId, user.id, notes);
      setHuntStatus('rejected');
      setReviewNotes(notes);
      toast.success('Hunt rejected');
    } catch (e: any) { toast.error(e.message || 'Reject failed'); }
  };

  const handleSponsorLogoUpload = async (idx: number, file: File) => {
    setUploadingFor(idx);
    try {
      const url = await huntsService.uploadAsset(file, 'sponsors');
      updateSponsor(idx, s => ({ ...s, logo: url }));
      toast.success('Logo uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploadingFor(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const backTo = mode === 'admin' ? '/admin/hunts' : '/org/hunts';
  const statusBadge = (() => {
    const map: Record<string, { label: string; cls: string }> = {
      draft:          { label: 'Draft',          cls: 'bg-muted text-foreground' },
      pending_review: { label: 'Pending review', cls: 'bg-amber-100 text-amber-800' },
      published:      { label: 'Published',      cls: 'bg-emerald-100 text-emerald-800' },
      rejected:       { label: 'Rejected',       cls: 'bg-rose-100 text-rose-800' },
    };
    const m = map[huntStatus] ?? map.draft;
    return <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', m.cls)}>{m.label}</span>;
  })();

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 flex items-center gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <button onClick={() => navigate(backTo)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight" aria-label="Back">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">{mode === 'admin' ? 'Admin' : 'Org'} · Hunt builder</p>
          <p className="text-sm font-bold truncate">{hunt.title || (isNew ? 'New hunt' : 'Untitled')}</p>
        </div>
        {statusBadge}
      </div>

      {reviewNotes && huntStatus === 'rejected' && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Rejected — please address and resubmit:</p>
            <p className="mt-0.5">{reviewNotes}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Basics */}
        <Section title="Basics">
          <Field label="Title">
            <Input value={hunt.title ?? ''} onChange={e => updateField('title', e.target.value)} placeholder="Berkeley Through Kids' Eyes" />
          </Field>
          <Field label="Slug (URL part — letters, numbers, dashes)">
            <Input value={hunt.slug ?? ''} onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="berkeley-kids-eyes" />
          </Field>
          <Field label="Blurb (1–2 sentences)">
            <Textarea value={hunt.blurb ?? ''} onChange={e => updateField('blurb', e.target.value)} rows={3} placeholder="A four-stop walk for the youngest explorers…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cover emoji">
              <Input value={hunt.coverEmoji ?? '🔍'} onChange={e => updateField('coverEmoji', e.target.value)} maxLength={4} />
            </Field>
            <Field label="Primary theme">
              <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={hunt.primaryTheme} onChange={e => updateField('primaryTheme', e.target.value as any)}>
                {['history', 'music', 'nature', 'art', 'food', 'science', 'community'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Host name (org / venue)">
            <Input value={hunt.hostName ?? ''} onChange={e => updateField('hostName', e.target.value)} placeholder="Brockton Art Museum" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><Input value={hunt.city ?? ''} onChange={e => updateField('city', e.target.value)} /></Field>
            <Field label="Country code (US / LV)">
              <Input value={hunt.countryCode ?? 'US'} onChange={e => updateField('countryCode', e.target.value.toUpperCase())} maxLength={2} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min age"><Input type="number" min={0} max={18} value={hunt.ageMin ?? 6} onChange={e => updateField('ageMin', parseInt(e.target.value || '0'))} /></Field>
            <Field label="Max age"><Input type="number" min={0} max={99} value={hunt.ageMax ?? 14} onChange={e => updateField('ageMax', parseInt(e.target.value || '0'))} /></Field>
            <Field label="Difficulty">
              <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={hunt.difficulty} onChange={e => updateField('difficulty', e.target.value as any)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
          </div>
          <Field label="Duration (minutes)">
            <Input type="number" min={10} value={hunt.durationMinutes ?? 120} onChange={e => updateField('durationMinutes', parseInt(e.target.value || '0'))} />
          </Field>
          <Field label="Credits / 'designed by' (optional)">
            <Textarea value={hunt.credits ?? ''} onChange={e => updateField('credits', e.target.value)} rows={2} />
          </Field>
        </Section>

        {/* Stops */}
        <Section title={`Stops (${(hunt.stops ?? []).length})`}>
          {(hunt.stops ?? []).map((s, i) => (
            <div key={s.id} className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{i + 1}</span>
                <span className="font-semibold text-sm flex-1 truncate">{s.title || 'Untitled stop'}</span>
                <button onClick={() => moveStop(i, 'up')} disabled={i === 0} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                <button onClick={() => moveStop(i, 'down')} disabled={i === (hunt.stops?.length ?? 1) - 1} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                <button onClick={() => removeStop(i)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>

              <Field label="Title"><Input value={s.title} onChange={e => updateStop(i, x => ({ ...x, title: e.target.value }))} placeholder="Tilden Little Farm" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude"><Input type="number" step="any" value={s.lat} onChange={e => updateStop(i, x => ({ ...x, lat: parseFloat(e.target.value || '0') }))} /></Field>
                <Field label="Longitude"><Input type="number" step="any" value={s.lon} onChange={e => updateStop(i, x => ({ ...x, lon: parseFloat(e.target.value || '0') }))} /></Field>
              </div>
              <Field label="Address (optional)"><Input value={s.address ?? ''} onChange={e => updateStop(i, x => ({ ...x, address: e.target.value }))} /></Field>
              <Field label="Clue (shown to player)">
                <Textarea value={s.clueText} rows={3} onChange={e => updateStop(i, x => ({ ...x, clueText: e.target.value }))} />
              </Field>
              <Field label="Parent hint (optional — shown when kid taps 'Ask a grown-up')">
                <Textarea value={s.parentHint ?? ''} rows={2} onChange={e => updateStop(i, x => ({ ...x, parentHint: e.target.value }))} placeholder="A nudge a grown-up can read aloud or paraphrase, without giving the answer outright." />
              </Field>

              {/* Prompt */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Prompt</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROMPT_KINDS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => updateStop(i, x => ({ ...x, prompt: { kind: p.value, question: x.prompt.question, options: p.value === 'multiple_choice' ? (x.prompt.options ?? []) : undefined, correctAnswers: p.value !== 'photo' && p.value !== 'observation' ? (x.prompt.correctAnswers ?? []) : undefined, photoSubject: p.value === 'photo' ? x.prompt.photoSubject : undefined } }))}
                      className={cn('rounded-xl border-2 p-2 text-left text-xs', s.prompt.kind === p.value ? 'border-primary bg-primary/8' : 'border-border bg-background')}
                    >
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{p.helper}</p>
                    </button>
                  ))}
                </div>
                <Field label="Question"><Input value={s.prompt.question} onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, question: e.target.value } }))} /></Field>

                {s.prompt.kind === 'text' && (
                  <Field label="Acceptable answers (comma-separated, case-insensitive)">
                    <Input
                      value={(s.prompt.correctAnswers ?? []).join(', ')}
                      onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, correctAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }))}
                      placeholder="pig, piglet, swine"
                    />
                  </Field>
                )}

                {s.prompt.kind === 'multiple_choice' && (
                  <>
                    <Field label="Options (one per line)">
                      <Textarea
                        rows={4}
                        value={(s.prompt.options ?? []).join('\n')}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } }))}
                        placeholder={'Pig\nGoat\nSheep\nCow'}
                      />
                    </Field>
                    <Field label="Correct option (must match one option exactly)">
                      <Input
                        value={(s.prompt.correctAnswers ?? [])[0] ?? ''}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, correctAnswers: [e.target.value] } }))}
                        placeholder="Pig"
                      />
                    </Field>
                  </>
                )}

                {s.prompt.kind === 'photo' && (
                  <Field label="What should the photo show?">
                    <Input value={s.prompt.photoSubject ?? ''} onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, photoSubject: e.target.value } }))} placeholder="A piglet at Little Farm" />
                  </Field>
                )}
              </div>

              {/* Reveal */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reveal — fun fact</p>
                <Textarea rows={3} value={s.reveal.funFact} onChange={e => updateStop(i, x => ({ ...x, reveal: { ...x.reveal, funFact: e.target.value } }))} />
              </div>
            </div>
          ))}

          <button onClick={addStop} className="w-full h-12 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground tap-highlight">
            <Plus className="w-4 h-4" /> Add stop
          </button>
        </Section>

        {/* Sponsors */}
        <Section title={`Sponsors (${(hunt.sponsors ?? []).length})`}>
          <p className="text-xs text-muted-foreground">Like the corner sponsors on the Music Map of Dallas — small logo + link.</p>
          {(hunt.sponsors ?? []).map((sp, i) => (
            <div key={i} className="rounded-2xl border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold flex-1 truncate">{sp.name || 'Untitled sponsor'}</span>
                <button onClick={() => removeSponsor(i)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive"><X className="w-4 h-4" /></button>
              </div>
              <Field label="Name"><Input value={sp.name} onChange={e => updateSponsor(i, x => ({ ...x, name: e.target.value }))} /></Field>
              <Field label="URL"><Input value={sp.url ?? ''} onChange={e => updateSponsor(i, x => ({ ...x, url: e.target.value }))} placeholder="https://…" /></Field>
              <div className="flex items-center gap-2">
                {sp.logo && <img src={sp.logo} alt="" className="w-12 h-12 rounded-xl object-cover border" />}
                <input
                  ref={uploadingFor === i ? fileRef : undefined}
                  type="file" accept="image/*"
                  className="hidden"
                  id={`sponsor-logo-${i}`}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleSponsorLogoUpload(i, f); }}
                />
                <label htmlFor={`sponsor-logo-${i}`} className="cursor-pointer h-9 px-3 rounded-full border border-border text-xs font-medium flex items-center gap-1.5 hover:bg-muted">
                  <Upload className="w-3.5 h-3.5" /> {uploadingFor === i ? 'Uploading…' : sp.logo ? 'Replace logo' : 'Upload logo'}
                </label>
              </div>
            </div>
          ))}
          <button onClick={addSponsor} className="w-full h-11 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground tap-highlight">
            <Plus className="w-4 h-4" /> Add sponsor
          </button>
        </Section>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold tap-highlight flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>

          {/* Org actions */}
          {mode === 'org' && (huntStatus === 'draft' || huntStatus === 'rejected') && huntId && (
            <button onClick={handleSubmitForReview} className="w-full h-11 rounded-2xl bg-amber-500 text-white font-medium tap-highlight flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Submit for review
            </button>
          )}

          {/* Admin actions */}
          {mode === 'admin' && huntId && huntStatus !== 'published' && (
            <div className="flex gap-2">
              <button onClick={handleReject} className="flex-1 h-11 rounded-2xl bg-rose-100 text-rose-800 font-medium tap-highlight flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Reject
              </button>
              <button onClick={handleApprove} className="flex-1 h-11 rounded-2xl bg-emerald-500 text-white font-medium tap-highlight flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Approve & publish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tiny presentational helpers ───────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
