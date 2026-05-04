/**
 * HuntEdit — shared hunt builder used by both /org/hunts/:id and /admin/hunts/:id
 * (and their /new variants for creation). Capability-scoped via path.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Send, CheckCircle2, AlertCircle, Upload, X, Bot, FileText, Sparkles, Workflow, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { huntsService } from '@/services/huntsService';
import type { ScavengerHunt, HuntStop, HuntPromptKind, HuntSponsor } from '@/types/hunt';
import { authService } from '@/services';
import { cn } from '@/lib/utils';

type Mode = 'org' | 'admin';
type HuntCreatorMode = 'human' | 'ai_assisted' | 'ai_generated';

const PROMPT_KINDS: { value: HuntPromptKind; label: string; helper: string }[] = [
  { value: 'text',            label: '📝 Text',         helper: 'Player types an answer (case-insensitive contains-match against your list).' },
  { value: 'multiple_choice', label: '🔘 Multiple choice', helper: 'Player picks one of the options. Mark which is correct.' },
  { value: 'photo',           label: '📷 Photo',        helper: 'Player takes a photo of the subject — always accepted.' },
  { value: 'audio',           label: '🎙️ Sound',         helper: 'Player records a short sound clip (sea lions, parrots, fountain). Always accepted.' },
  { value: 'drawing',         label: '✏️ Drawing',       helper: 'Player draws on an in-app canvas. Always accepted.' },
  { value: 'time_travel_photo', label: '🕰️ Time-travel', helper: 'Player lines up a source image over the live camera, then captures today + then.' },
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function splitLines(value: string): string[] {
  return value.split('\n').map(line => line.trim()).filter(Boolean);
}

function splitSourceLinks(value: string): string[] {
  return splitLines(value).flatMap(line => line.split(',')).map(link => link.trim()).filter(Boolean);
}

export default function HuntEdit() {
  const params = useParams<{ id?: string }>();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const mode: Mode = pathname.startsWith('/admin/') ? 'admin' : 'org';
  const isNew = !params.id || params.id === 'new';
  const startsFromAi = new URLSearchParams(search).get('mode') === 'ai';
  const draftStorageKey = isNew ? `famactify-hunt-builder-draft:${mode}:${startsFromAi ? 'ai' : 'blank'}` : null;

  const [loading, setLoading] = useState(!isNew);
  const [draftHydrated, setDraftHydrated] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [huntStatus, setHuntStatus] = useState<string>('draft');
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [hunt, setHunt] = useState<Partial<ScavengerHunt>>({
    slug: '',
    artifactKind: 'scavenger_hunt',
    artifactVersion: 1,
    createdVia: startsFromAi ? 'ai_assisted' : 'human',
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
    sourceLinks: [],
    aiPrompt: '',
    generationNotes: '',
    stops: [],
    sponsors: [],
  });
  const [huntId, setHuntId] = useState<string | null>(isNew ? null : (params.id ?? null));
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null); // sponsor index being uploaded for
  const [uploadingStepAudioFor, setUploadingStepAudioFor] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(isNew && startsFromAi);
  const [aiPlace, setAiPlace] = useState('');
  const [aiSourceLinks, setAiSourceLinks] = useState('');
  const [aiSourceFacts, setAiSourceFacts] = useState('');
  const [aiStopIdeas, setAiStopIdeas] = useState('');

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

  // New hunt drafts are long forms. Keep a tab-session draft so auth/admin
  // background refreshes, accidental browser refreshes, or tab switches do not
  // silently erase everything before the first explicit Save.
  useEffect(() => {
    if (!draftStorageKey) return;
    try {
      const raw = sessionStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.hunt) setHunt(parsed.hunt);
        if (typeof parsed?.assistantOpen === 'boolean') setAssistantOpen(parsed.assistantOpen);
        if (typeof parsed?.aiPlace === 'string') setAiPlace(parsed.aiPlace);
        if (typeof parsed?.aiSourceLinks === 'string') setAiSourceLinks(parsed.aiSourceLinks);
        if (typeof parsed?.aiSourceFacts === 'string') setAiSourceFacts(parsed.aiSourceFacts);
        if (typeof parsed?.aiStopIdeas === 'string') setAiStopIdeas(parsed.aiStopIdeas);
      }
    } catch (error) {
      console.warn('[HuntEdit] Could not restore new hunt draft', error);
    } finally {
      setDraftHydrated(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || !draftHydrated) return;
    const handle = window.setTimeout(() => {
      try {
        sessionStorage.setItem(draftStorageKey, JSON.stringify({
          hunt,
          assistantOpen,
          aiPlace,
          aiSourceLinks,
          aiSourceFacts,
          aiStopIdeas,
        }));
      } catch (error) {
        console.warn('[HuntEdit] Could not persist new hunt draft', error);
      }
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draftStorageKey, draftHydrated, hunt, assistantOpen, aiPlace, aiSourceLinks, aiSourceFacts, aiStopIdeas]);

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
      if (s.prompt.kind === 'time_travel_photo' && !s.prompt.timeTravelImageUrl?.trim()) {
        return `Stop ${i + 1}: time-travel photo needs a historical/source image URL`;
      }
    }
    if ((hunt.createdVia === 'ai_assisted' || hunt.createdVia === 'ai_generated') && !(hunt.sourceLinks?.length) && !hunt.credits?.trim()) {
      return 'AI-assisted hunts need source links or source notes in credits';
    }
    return null;
  };

  const handleGenerateArtifactDraft = () => {
    const place = aiPlace.trim() || hunt.hostName?.trim() || hunt.title?.trim();
    const facts = splitLines(aiSourceFacts);
    const links = splitSourceLinks(aiSourceLinks);
    const stopIdeas = splitLines(aiStopIdeas);

    if (!place) { toast.error('Add venue/place name first'); return; }
    if (facts.length === 0 && links.length === 0) { toast.error('Paste at least one source fact or link'); return; }

    const stopTitles = (stopIdeas.length ? stopIdeas : facts.slice(0, 5).map((fact, i) => {
      const clean = fact.replace(/^[-*•]\s*/, '').split(/[.:—-]/)[0]?.trim();
      return clean && clean.length <= 48 ? clean : `Source clue ${i + 1}`;
    })).slice(0, 6);

    const generatedStops: HuntStop[] = stopTitles.map((title, i) => {
      const fact = facts[i] ?? facts[0] ?? 'Use one verified source fact for this stop before publishing.';
      return {
        id: crypto.randomUUID(),
        order: i,
        title,
        lat: 0,
        lon: 0,
        address: '',
        clueText: `Find “${title}” at ${place}. Use venue signs, maps, or staff-approved route notes to guide families safely.`,
        parentHint: 'AI-assisted draft: verify the route, coordinates, safety, accessibility, and source-backed fact before submitting for review.',
        prompt: {
          kind: i === stopTitles.length - 1 ? 'photo' : 'observation',
          question: i === stopTitles.length - 1
            ? 'Take one privacy-safe memory photo of a detail — no faces.'
            : `Notice one real detail connected with: ${title}.`,
          photoSubject: i === stopTitles.length - 1 ? `${place} detail without faces` : undefined,
        },
        reveal: {
          funFact: fact,
        },
      };
    });

    const sourceSummary = links.length ? ` Links: ${links.join('; ')}` : '';
    setHunt(prev => ({
      ...prev,
      artifactKind: 'scavenger_hunt',
      artifactVersion: 1,
      createdVia: 'ai_assisted',
      hostName: prev.hostName || place,
      title: prev.title || `${place} Scavenger Hunt`,
      slug: prev.slug || slugify(`${place}-scavenger-hunt`),
      blurb: prev.blurb || `A place-based scavenger hunt for families visiting ${place}, drafted from source-backed venue facts.`,
      coverEmoji: prev.coverEmoji || '🔍',
      primaryTheme: prev.primaryTheme || 'community',
      city: prev.city || '',
      countryCode: prev.countryCode || 'US',
      credits: prev.credits || `AI-assisted draft from venue-provided source facts.${sourceSummary}`,
      sourceLinks: links,
      aiPrompt: [
        `Create a family scavenger hunt artifact for ${place}.`,
        aiSourceFacts.trim(),
        aiStopIdeas.trim() ? `Requested stops:\n${aiStopIdeas.trim()}` : '',
      ].filter(Boolean).join('\n\n'),
      generationNotes: 'AI-assisted artifact draft. Human venue author must verify every stop, coordinate, clue, source fact, safety note, and photo/privacy instruction before review.',
      stops: generatedStops,
    }));
    toast.success('AI-assisted artifact draft created — now verify and edit it');
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
          createdVia: hunt.createdVia,
          sourceLinks: hunt.sourceLinks,
          aiPrompt: hunt.aiPrompt,
          generationNotes: hunt.generationNotes,
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
          createdVia: hunt.createdVia,
          sourceLinks: hunt.sourceLinks,
          aiPrompt: hunt.aiPrompt,
          generationNotes: hunt.generationNotes,
        });
      }
      await huntsService.replaceStops(id, hunt.stops ?? []);
      await huntsService.replaceSponsors(id, hunt.sponsors ?? []);
      if (draftStorageKey) sessionStorage.removeItem(draftStorageKey);
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

  const handleStepAudioUpload = async (idx: number, file: File) => {
    setUploadingStepAudioFor(idx);
    try {
      const url = await huntsService.uploadAsset(file, 'step-audio');
      updateStop(idx, stop => ({ ...stop, clueAudio: url }));
      toast.success('Audio guide uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Audio upload failed');
    } finally {
      setUploadingStepAudioFor(null);
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
    <div className="min-h-[100dvh] bg-background pb-tab-bar [&_input::placeholder]:italic [&_textarea::placeholder]:italic [&_input::placeholder]:text-muted-foreground/45 [&_textarea::placeholder]:text-muted-foreground/45">
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
        {/* Artifact workflow */}
        <Section title="Artifact workflow">
          <div className="rounded-3xl border bg-card p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Scavenger hunt artifact</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Draft → source-backed stops → submit for review → publish. A human can author it directly, or an AI/agent can draft the same artifact for human verification.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[10px] font-semibold">
              {[
                ['Draft', 'draft'],
                ['Review', 'pending_review'],
                ['Published', 'published'],
                ['Rejected', 'rejected'],
              ].map(([label, state]) => (
                <div key={state} className={cn(
                  'rounded-xl px-2 py-2 text-center border',
                  huntStatus === state ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground',
                )}>
                  {label}
                </div>
              ))}
            </div>

            {isNew && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { updateField('createdVia', 'human'); setAssistantOpen(false); }}
                  className={cn('rounded-2xl border-2 p-3 text-left tap-highlight', hunt.createdVia === 'human' ? 'border-primary bg-primary/8' : 'border-border')}
                >
                  <FileText className="w-4 h-4 mb-2 text-primary" />
                  <p className="text-xs font-bold">Blank artifact</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Venue team writes every field.</p>
                </button>
                <button
                  onClick={() => { updateField('createdVia', 'ai_assisted'); setAssistantOpen(true); }}
                  className={cn('rounded-2xl border-2 p-3 text-left tap-highlight', hunt.createdVia !== 'human' ? 'border-primary bg-primary/8' : 'border-border')}
                >
                  <Bot className="w-4 h-4 mb-2 text-primary" />
                  <p className="text-xs font-bold">AI-assisted draft</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Paste source facts; generate editable stops.</p>
                </button>
              </div>
            )}

            {assistantOpen && (
              <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-amber-50 border border-pink-100 p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-pink-700 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-pink-900">AI draft helper</p>
                    <p className="text-xs text-pink-800/80 leading-relaxed">
                      This creates an editable artifact scaffold from venue-provided facts. It does not replace human fact-checking, route safety, or admin review.
                    </p>
                  </div>
                </div>
                <Field label="Venue / place name">
                  <Input value={aiPlace} onChange={e => setAiPlace(e.target.value)} placeholder="Riga Zoo, museum, park, market…" />
                </Field>
                <Field label="Source links (one per line)">
                  <Textarea value={aiSourceLinks} onChange={e => setAiSourceLinks(e.target.value)} rows={3} placeholder="https://official-site.example/page&#10;https://city.example/venue" />
                </Field>
                <Field label="Source facts / venue brief">
                  <Textarea value={aiSourceFacts} onChange={e => setAiSourceFacts(e.target.value)} rows={5} placeholder="Paste only facts the venue can stand behind: opening year, exhibit names, route notes, safety notes, accessibility notes…" />
                </Field>
                <Field label="Desired stops (optional, one per line)">
                  <Textarea value={aiStopIdeas} onChange={e => setAiStopIdeas(e.target.value)} rows={4} placeholder="Entrance sign&#10;Main exhibit&#10;Outdoor sculpture&#10;Memory photo spot" />
                </Field>
                <button onClick={handleGenerateArtifactDraft} className="w-full h-11 rounded-2xl bg-pink-600 text-white font-semibold tap-highlight flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> Generate editable artifact draft
                </button>
              </div>
            )}
          </div>
        </Section>

        {/* Provenance */}
        <Section title="Artifact provenance">
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Creator mode">
                <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={hunt.createdVia ?? 'human'} onChange={e => updateField('createdVia', e.target.value as HuntCreatorMode)}>
                  <option value="human">Human-created</option>
                  <option value="ai_assisted">AI-assisted</option>
                  <option value="ai_generated">AI-generated</option>
                </select>
              </Field>
              <Field label="Artifact version">
                <Input type="number" min={1} value={hunt.artifactVersion ?? 1} onChange={e => updateField('artifactVersion', parseInt(e.target.value || '1'))} />
              </Field>
            </div>
            <Field label="Source links (one per line)">
              <Textarea
                value={(hunt.sourceLinks ?? []).join('\n')}
                onChange={e => updateField('sourceLinks', splitSourceLinks(e.target.value))}
                rows={3}
                placeholder="Official venue page, city page, exhibit page…"
              />
            </Field>
            <Field label="AI / agent prompt or brief (optional)">
              <Textarea value={hunt.aiPrompt ?? ''} onChange={e => updateField('aiPrompt', e.target.value)} rows={3} placeholder="Prompt/brief used by an AI agent to draft this hunt." />
            </Field>
            <Field label="Generation + verification notes">
              <Textarea value={hunt.generationNotes ?? ''} onChange={e => updateField('generationNotes', e.target.value)} rows={3} placeholder="What was generated? What did a human verify? What still needs review?" />
            </Field>
          </div>
        </Section>

        {/* Basics */}
        <Section title="Basics">
          <Field label="Title" required>
            <Input value={hunt.title ?? ''} onChange={e => updateField('title', e.target.value)} placeholder="Berkeley Through Kids' Eyes" />
          </Field>
          <Field label="Slug (URL part — letters, numbers, dashes)" required>
            <Input value={hunt.slug ?? ''} onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="berkeley-kids-eyes" />
          </Field>
          <Field label="Blurb (1–2 sentences)" required>
            <Textarea value={hunt.blurb ?? ''} onChange={e => updateField('blurb', e.target.value)} rows={3} placeholder="A four-stop walk for the youngest explorers…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cover emoji">
              <Input value={hunt.coverEmoji ?? '🔍'} onChange={e => updateField('coverEmoji', e.target.value)} maxLength={4} />
            </Field>
            <Field label="Primary theme" required>
              <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={hunt.primaryTheme} onChange={e => updateField('primaryTheme', e.target.value as any)}>
                {['history', 'music', 'nature', 'art', 'food', 'science', 'community'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Host name (org / venue)" required>
            <Input value={hunt.hostName ?? ''} onChange={e => updateField('hostName', e.target.value)} placeholder="Brockton Art Museum" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required><Input value={hunt.city ?? ''} onChange={e => updateField('city', e.target.value)} placeholder="San Francisco" /></Field>
            <Field label="Country code (US / LV)" required>
              <Input value={hunt.countryCode ?? 'US'} onChange={e => updateField('countryCode', e.target.value.toUpperCase())} maxLength={2} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Min age" required><Input type="number" min={0} max={18} value={hunt.ageMin ?? 6} onChange={e => updateField('ageMin', parseInt(e.target.value || '0'))} /></Field>
            <Field label="Max age" required><Input type="number" min={0} max={99} value={hunt.ageMax ?? 14} onChange={e => updateField('ageMax', parseInt(e.target.value || '0'))} /></Field>
            <Field label="Difficulty" required>
              <select className="h-11 w-full rounded-xl border bg-background px-3 text-sm" value={hunt.difficulty} onChange={e => updateField('difficulty', e.target.value as any)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
          </div>
          <Field label="Duration (minutes)" required>
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

              <Field label="Title" required><Input value={s.title} onChange={e => updateStop(i, x => ({ ...x, title: e.target.value }))} placeholder="Tilden Little Farm" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" required><Input type="number" step="any" value={s.lat} onChange={e => updateStop(i, x => ({ ...x, lat: parseFloat(e.target.value || '0') }))} placeholder="37.75046" /></Field>
                <Field label="Longitude" required><Input type="number" step="any" value={s.lon} onChange={e => updateStop(i, x => ({ ...x, lon: parseFloat(e.target.value || '0') }))} placeholder="-122.44053" /></Field>
              </div>
              <Field label="Address (optional)"><Input value={s.address ?? ''} onChange={e => updateStop(i, x => ({ ...x, address: e.target.value }))} /></Field>
              <Field label="Clue (shown to player)" required>
                <Textarea value={s.clueText} rows={3} onChange={e => updateStop(i, x => ({ ...x, clueText: e.target.value }))} />
              </Field>
              <Field label="Clue in Latvian (optional — shown when player taps 🇱🇻)">
                <Textarea
                  value={s.clueTextLv ?? ''}
                  rows={3}
                  onChange={e => updateStop(i, x => ({ ...x, clueTextLv: e.target.value }))}
                  placeholder="Latviešu versija šim pavedienam."
                />
              </Field>
              <Field label="Audio guide / soundtrack (optional)">
                <div className="space-y-2">
                  <Input
                    value={s.clueAudio ?? ''}
                    onChange={e => updateStop(i, x => ({ ...x, clueAudio: e.target.value }))}
                    placeholder="https://.../stop-01-audio-guide.mp3"
                  />
                  {s.clueAudio && (
                    <div className="rounded-xl border bg-muted/40 p-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                        <Headphones className="w-3.5 h-3.5" /> Preview audio guide
                      </div>
                      <audio src={s.clueAudio} controls className="w-full h-9" preload="metadata" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className={cn(
                      'h-10 px-3 rounded-xl border bg-background text-sm font-medium tap-highlight flex items-center justify-center gap-2 cursor-pointer',
                      uploadingStepAudioFor === i && 'opacity-60 pointer-events-none',
                    )}>
                      <Upload className="w-4 h-4" />
                      {uploadingStepAudioFor === i ? 'Uploading…' : 'Upload audio'}
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleStepAudioUpload(i, file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                    {s.clueAudio && (
                      <button
                        type="button"
                        onClick={() => updateStop(i, x => ({ ...x, clueAudio: '' }))}
                        className="h-10 px-3 rounded-xl border text-sm font-medium tap-highlight flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Use this for a venue voice-over, ambient soundtrack, or simple audio guide. Player sees it on the clue screen before answering.
                  </p>
                </div>
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
                      onClick={() => updateStop(i, x => ({
                        ...x,
                        prompt: {
                          kind: p.value,
                          question: x.prompt.question,
                          options: p.value === 'multiple_choice' ? (x.prompt.options ?? []) : undefined,
                          correctAnswers: p.value === 'text' || p.value === 'multiple_choice' ? (x.prompt.correctAnswers ?? []) : undefined,
                          photoSubject:    p.value === 'photo'   ? x.prompt.photoSubject   : undefined,
                          audioSubject:    p.value === 'audio'   ? x.prompt.audioSubject   : undefined,
                          audioMaxSeconds: p.value === 'audio'   ? (x.prompt.audioMaxSeconds ?? 5) : undefined,
                          drawingSubject:  p.value === 'drawing' ? x.prompt.drawingSubject : undefined,
                          timeTravelImageUrl: p.value === 'time_travel_photo' ? x.prompt.timeTravelImageUrl : undefined,
                          timeTravelCaption:  p.value === 'time_travel_photo' ? x.prompt.timeTravelCaption  : undefined,
                          timeTravelOpacity:  p.value === 'time_travel_photo' ? (x.prompt.timeTravelOpacity ?? 0.5) : undefined,
                        },
                      }))}
                      className={cn('rounded-xl border-2 p-2 text-left text-xs', s.prompt.kind === p.value ? 'border-primary bg-primary/8' : 'border-border bg-background')}
                    >
                      <p className="font-semibold">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{p.helper}</p>
                    </button>
                  ))}
                </div>
                <Field label="Question" required><Input value={s.prompt.question} onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, question: e.target.value } }))} placeholder="What should the kid do or answer here?" /></Field>

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
                    <Field label="Options (one per line)" required>
                      <Textarea
                        rows={4}
                        value={(s.prompt.options ?? []).join('\n')}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) } }))}
                        placeholder={'Pig\nGoat\nSheep\nCow'}
                      />
                    </Field>
                    <Field label="Correct option (must match one option exactly)" required>
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

                {s.prompt.kind === 'audio' && (
                  <>
                    <Field label="What to listen for (informative)">
                      <Input value={s.prompt.audioSubject ?? ''} onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, audioSubject: e.target.value } }))} placeholder="Sea lions barking at Pier 39" />
                    </Field>
                    <Field label="Max recording length (seconds, 2–15)">
                      <Input
                        type="number"
                        min={2}
                        max={15}
                        value={s.prompt.audioMaxSeconds ?? 5}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, audioMaxSeconds: Math.max(2, Math.min(15, parseInt(e.target.value || '5'))) } }))}
                      />
                    </Field>
                  </>
                )}

                {s.prompt.kind === 'drawing' && (
                  <Field label="What to draw (informative)">
                    <Input value={s.prompt.drawingSubject ?? ''} onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, drawingSubject: e.target.value } }))} placeholder="The shape of the bridge tower" />
                  </Field>
                )}

                {s.prompt.kind === 'time_travel_photo' && (
                  <>
                    <Field label="Historical/source image URL" required>
                      <Input
                        value={s.prompt.timeTravelImageUrl ?? ''}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, timeTravelImageUrl: e.target.value } }))}
                        placeholder="https://archive.org/.../historic-photo.jpg"
                      />
                    </Field>
                    <Field label="Overlay caption / source note">
                      <Textarea
                        rows={2}
                        value={s.prompt.timeTravelCaption ?? ''}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, timeTravelCaption: e.target.value } }))}
                        placeholder="Source: venue archive / public collection. Used to line up the old view with today."
                      />
                    </Field>
                    <Field label="Overlay opacity (0.1–0.85, default 0.5)">
                      <Input
                        type="number"
                        min={0.1}
                        max={0.85}
                        step={0.05}
                        value={s.prompt.timeTravelOpacity ?? 0.5}
                        onChange={e => updateStop(i, x => ({ ...x, prompt: { ...x.prompt, timeTravelOpacity: Math.max(0.1, Math.min(0.85, parseFloat(e.target.value || '0.5'))) } }))}
                      />
                    </Field>
                  </>
                )}
              </div>

              {/* Reveal */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reveal — fun fact</p>
                <Field label="Fun fact" required>
                  <Textarea rows={3} value={s.reveal.funFact} onChange={e => updateStop(i, x => ({ ...x, reveal: { ...x.reveal, funFact: e.target.value } }))} placeholder="A source-backed fact revealed after the stop." />
                </Field>
                <Field label="Fun fact in Latvian (optional — shown when player taps 🇱🇻)">
                  <Textarea
                    rows={3}
                    value={s.reveal.funFactLv ?? ''}
                    onChange={e => updateStop(i, x => ({ ...x, reveal: { ...x.reveal, funFactLv: e.target.value } }))}
                    placeholder="Latviešu versija atklājumam / interesantajam faktam."
                  />
                </Field>
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

function Field({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label className={cn('text-xs font-medium flex items-center gap-1.5', required ? 'text-rose-700' : 'text-muted-foreground')}>
        <span>{label}</span>
        {required && <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700">Required</span>}
      </Label>
      {children}
    </div>
  );
}
