// MP-T2: Unified play session page — ports HuntPlay's 8 widget kinds onto the new sessions engine.
// Route: /play/:sessionId/play
// Supports solo (symmetric) + duo (guide_and_solver) in this sprint. Race (team_vs_team) follows in MP-T4.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Camera, SkipForward, Loader2, Target,
  Play, Pause, Square, Mic, Volume2, VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sessionService } from '@/services/sessionService';
import type { HuntSession, SessionTeam, SessionParticipant, SessionArtifact } from '@/types/session';
import { useHunt } from '@/hooks/useHunt';
import AudioRecorder from '@/components/AudioRecorder';
import VoiceAnswerInput from '@/components/VoiceAnswerInput';
import DrawingPad from '@/components/DrawingPad';
import TimeTravelCamera from '@/components/TimeTravelCamera';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import LiveArtifactStream from '@/components/play/LiveArtifactStream';
import PromptTaskBadge from '@/components/play/PromptTaskBadge';
import TeamScoreboard from '@/components/play/TeamScoreboard';
import type { HuntPromptKind } from '@/types/hunt';

// ── Prompt action copy (mirrored from HuntPlay) ──────────────────────────
function getPromptActionCopy(kind: HuntPromptKind): { title: string; cta: string } {
  switch (kind) {
    case 'time_travel_photo': return { title: 'Add now photo to history photo', cta: 'Open timeline camera' };
    case 'photo':             return { title: 'Take a photo', cta: 'Open camera' };
    case 'spot_photo':        return { title: 'Find the detail', cta: 'Start looking' };
    case 'audio':             return { title: 'Record a sound', cta: 'Record now' };
    case 'drawing':           return { title: 'Draw what you see', cta: 'Open drawing' };
    case 'voice_answer':      return { title: 'Say the answer', cta: 'Answer aloud' };
    case 'multiple_choice':   return { title: 'Pick the answer', cta: 'Answer now' };
    case 'observation':       return { title: 'Notice and confirm', cta: 'I noticed it' };
    case 'text':
    default:                  return { title: 'Answer the question', cta: 'Answer now' };
  }
}

// ── dataURL → File converter ─────────────────────────────────────────────
function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/png';
  const bstr = atob(arr[1]);
  const bytes = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

type Phase = 'clue' | 'prompt' | 'reveal';

export default function PlaySession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // ── Session state ────────────────────────────────────────────────────
  const [session, setSession] = useState<HuntSession | null>(null);
  const [teams, setTeams] = useState<SessionTeam[]>([]);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [me, setMe] = useState<SessionParticipant | null>(null);
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Play state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('clue');
  const [textAnswer, setTextAnswer] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [timeTravelPhotoDataUrl, setTimeTravelPhotoDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Hunt data ────────────────────────────────────────────────────────
  const { data: hunt = null, isLoading: huntLoading } = useHunt(session?.huntId ?? null);

  // ── Derived state ────────────────────────────────────────────────────
  const myTeam = teams.find(t => t.id === me?.teamId) ?? null;
  const totalStops = hunt?.stops.length ?? 0;
  const currentStopIndex = myTeam?.currentStop ?? 0;
  const currentStop = hunt && currentStopIndex < totalStops ? hunt.stops[currentStopIndex] : null;

  // Teams sorted by stops descending for scoreboard
  const isTeamVsTeam = session?.teamMode === 'team_vs_team';
  const isGuide = me?.role === 'guide';
  const isSolver = !isGuide;

  // My team's artifacts (for guide stream + results)
  const myTeamArtifacts = artifacts.filter(a => a.teamId === me?.teamId);

  // ── Initial data load ────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const [sess, teamList, participantList, myParticipant, artifactList] = await Promise.all([
          sessionService.getSession(sessionId),
          sessionService.listTeams(sessionId),
          sessionService.listParticipants(sessionId),
          sessionService.getMyParticipant(sessionId),
          sessionService.listArtifacts(sessionId),
        ]);
        if (cancelled) return;

        setSession(sess);
        setTeams(teamList);
        setParticipants(participantList);
        setMe(myParticipant);
        setArtifacts(artifactList);

        if (sess?.status === 'finished') {
          navigate(`/play/${sessionId}/results`, { replace: true });
        }
      } catch (err: any) {
        toast.error(err.message ?? 'Could not load game');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId, navigate]);

  // ── Realtime subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const unsub = sessionService.subscribe(sessionId, {
      onSessionChange: (s) => {
        setSession(s);
        if (s.status === 'finished') navigate(`/play/${sessionId}/results`, { replace: true });
      },
      onTeamsChange: (ts) => {
        setTeams(ts);
      },
      onParticipantsChange: (ps) => {
        setParticipants(ps);
      },
      onArtifactInsert: (artifact) => {
        setArtifacts(prev => [...prev, artifact]);
      },
    });
    return unsub;
  }, [sessionId, navigate, teams]);

  // ── Reset per-stop state when team advances ───────────────────────────
  const prevStopIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (!myTeam) return;
    const idx = myTeam.currentStop ?? 0;
    if (prevStopIndexRef.current !== -1 && idx !== prevStopIndexRef.current) {
      setPhase('clue');
      setTextAnswer('');
      setPhotoDataUrl(null);
      setAudioDataUrl(null);
      setDrawingDataUrl(null);
      setTimeTravelPhotoDataUrl(null);
    }
    prevStopIndexRef.current = idx;
  }, [myTeam?.currentStop]);

  // ── Stop TTS on unmount ───────────────────────────────────────────────
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  // ── Photo picker handler ──────────────────────────────────────────────
  const handlePhotoPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ── Submit + artifact recording ───────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!currentStop || !me || !myTeam || submitting) return;

    const stopId = currentStop.id;
    const stopIndex = currentStopIndex;
    const commonOpts = { sessionId: sessionId!, teamId: myTeam.id, participantId: me.id, stopId, stopIndex };

    setSubmitting(true);
    try {
      let kindDetected = currentStop.prompt.kind;

      if (kindDetected === 'text' || kindDetected === 'voice_answer') {
        const a = textAnswer.trim();
        if (!a) { toast.error('Type or say an answer first'); setSubmitting(false); return; }
        await sessionService.recordArtifact({ ...commonOpts, kind: 'text_answer', textValue: a });

      } else if (kindDetected === 'multiple_choice') {
        if (!textAnswer) { toast.error('Pick one option'); setSubmitting(false); return; }
        await sessionService.recordArtifact({ ...commonOpts, kind: 'mc_pick', textValue: textAnswer });

      } else if (kindDetected === 'photo') {
        if (!photoDataUrl) { toast.error('Take a photo first'); setSubmitting(false); return; }
        const file = dataUrlToFile(photoDataUrl, `photo-${Date.now()}.jpg`);
        const url = await sessionService.uploadArtifactPhoto(file, sessionId!, me.id);
        await sessionService.recordArtifact({ ...commonOpts, kind: 'photo', storageUrl: url });

      } else if (kindDetected === 'spot_photo') {
        if (photoDataUrl) {
          const file = dataUrlToFile(photoDataUrl, `spot-${Date.now()}.jpg`);
          const url = await sessionService.uploadArtifactPhoto(file, sessionId!, me.id);
          await sessionService.recordArtifact({ ...commonOpts, kind: 'photo', storageUrl: url });
        } else {
          await sessionService.recordArtifact({ ...commonOpts, kind: 'observation_ack', textValue: 'spotted' });
        }

      } else if (kindDetected === 'audio') {
        if (!audioDataUrl) { toast.error('Record a sound first'); setSubmitting(false); return; }
        const mimeHint = audioDataUrl.split(';')[0].split(':')[1] ?? 'audio/webm';
        const ext = mimeHint.includes('mp4') ? 'm4a' : mimeHint.includes('ogg') ? 'ogg' : 'webm';
        const file = dataUrlToFile(audioDataUrl, `audio-${Date.now()}.${ext}`);
        // Audio can be large; skip 2MB check for now — audio files are typically small
        const path = `session-artifacts/${sessionId}/${me.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await (await import('@/integrations/supabase/client')).supabase.storage
          .from('activity-images')
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = (await import('@/integrations/supabase/client')).supabase.storage
          .from('activity-images').getPublicUrl(path);
        await sessionService.recordArtifact({ ...commonOpts, kind: 'audio', storageUrl: urlData.publicUrl });

      } else if (kindDetected === 'drawing') {
        if (!drawingDataUrl) { toast.error('Draw something first'); setSubmitting(false); return; }
        const file = dataUrlToFile(drawingDataUrl, `drawing-${Date.now()}.png`);
        const url = await sessionService.uploadArtifactPhoto(file, sessionId!, me.id);
        await sessionService.recordArtifact({ ...commonOpts, kind: 'drawing', storageUrl: url });

      } else if (kindDetected === 'time_travel_photo') {
        if (!timeTravelPhotoDataUrl) { toast.error('Line up and capture the time-travel photo first'); setSubmitting(false); return; }
        const file = dataUrlToFile(timeTravelPhotoDataUrl, `timetravel-${Date.now()}.jpg`);
        const url = await sessionService.uploadArtifactPhoto(file, sessionId!, me.id);
        await sessionService.recordArtifact({ ...commonOpts, kind: 'photo', storageUrl: url });

      } else {
        // observation
        await sessionService.recordArtifact({ ...commonOpts, kind: 'observation_ack', textValue: 'observed' });
      }

      setPhase('reveal');
    } catch (err: any) {
      toast.error(err.message ?? 'Could not save answer');
    } finally {
      setSubmitting(false);
    }
  }, [currentStop, currentStopIndex, me, myTeam, sessionId, textAnswer, photoDataUrl, audioDataUrl, drawingDataUrl, timeTravelPhotoDataUrl, submitting]);

  // ── Advance team to next stop ─────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (!myTeam || !session || advancing) return;
    const nextStop = currentStopIndex + 1;
    setAdvancing(true);
    try {
      await sessionService.advanceTeam(myTeam.id, nextStop, totalStops);
      if (nextStop >= totalStops) {
        // Check if all teams are done
        const updatedTeams = await sessionService.listTeams(sessionId!);
        const allDone = updatedTeams.every(t => t.finishedAt !== null);
        if (allDone) {
          await sessionService.finishSession(sessionId!);
        }
        navigate(`/play/${sessionId}/results`, { replace: true });
      } else {
        setPhase('clue');
        setTextAnswer('');
        setPhotoDataUrl(null);
        setAudioDataUrl(null);
        setDrawingDataUrl(null);
        setTimeTravelPhotoDataUrl(null);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Could not advance');
    } finally {
      setAdvancing(false);
    }
  }, [myTeam, session, sessionId, advancing, currentStopIndex, totalStops, navigate]);

  // ── Can the current user advance? ────────────────────────────────────
  const canAdvance = useCallback((): boolean => {
    if (!session || !me || !myTeam) return false;
    if (session.advancePolicy === 'anyone') return true;
    if (session.advancePolicy === 'team_leader') {
      return myTeam.teamLeaderId === me.userId;
    }
    // consensus — everyone must be in 'reveal' phase: just allow for now (MP-T5 enhancement)
    return true;
  }, [session, me, myTeam]);

  // ── Speak clue ────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US';
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [speaking]);

  // ── Loading / error states ───────────────────────────────────────────
  if (loading || huntLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session || !hunt || !me || !myTeam) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">😕</span>
        <p className="font-semibold">Could not load game</p>
        <button onClick={() => navigate('/hunts')} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm">
          Back to city games
        </button>
      </div>
    );
  }

  // ── End of game for my team ───────────────────────────────────────────
  if (currentStopIndex >= totalStops) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="text-2xl font-black">You finished!</h1>
        <p className="text-muted-foreground">Waiting for results…</p>
        <button
          onClick={() => navigate(`/play/${sessionId}/results`)}
          className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          See results
        </button>
      </div>
    );
  }

  const promptActionCopy = currentStop ? getPromptActionCopy(currentStop.prompt.kind) : null;
  const showNext = phase === 'reveal' && canAdvance();
  const isLastStop = currentStopIndex >= totalStops - 1;

  // ── Progress bar ──────────────────────────────────────────────────────
  function StopDots() {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {Array.from({ length: totalStops }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i < currentStopIndex ? 'bg-primary' : i === currentStopIndex ? 'bg-primary/70 ring-2 ring-primary/30' : 'bg-muted',
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b px-4 flex items-center gap-3"
        style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(env(safe-area-inset-top) + 48px)' }}
      >
        <button
          onClick={() => {
            if (window.confirm('Leave this game? Your progress is saved.')) {
              navigate('/hunts');
            }
          }}
          className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center tap-highlight"
          aria-label="Leave game"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{hunt.title}</p>
          <p className="text-sm font-bold">
            Step {currentStopIndex + 1} / {totalStops}
            {isGuide && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">· Guide view</span>}
          </p>
        </div>
        {/* My avatar chip */}
        <ParticipantAvatar
          p={{ id: me.id, familyEmoji: me.avatarEmoji, avatarUrl: me.avatarUrl, familyName: me.displayName } as any}
          size={32}
        />
      </div>

      {/* ── Stamp-dot progress ───────────────────────────────────────── */}
      <div className="px-4 py-2 border-b">
        <StopDots />
      </div>

      {/* ── Team scoreboard (team_vs_team only) ──────────────────────── */}
      {isTeamVsTeam && (
        <div className="px-4 py-2 border-b">
          <TeamScoreboard teams={teams} myTeamId={myTeam.id} totalStops={totalStops} />
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Clue card — always visible in 'clue' phase */}
        {(phase === 'clue' || phase === 'prompt' || phase === 'reveal') && currentStop && (
          <div className="rounded-3xl border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-black flex items-center justify-center">
                {currentStopIndex + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-base leading-tight">{currentStop.title}</p>
                {currentStop.address && (
                  <p className="text-xs text-muted-foreground mt-0.5">📍 {currentStop.address}</p>
                )}
              </div>
              <button
                onClick={() => speak(currentStop.clueText ?? '')}
                className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center tap-highlight"
                aria-label="Read clue aloud"
              >
                {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {currentStop.clueText ?? 'Head to this step, then complete the action.'}
            </p>
          </div>
        )}

        {/* CLUE phase — "I'm here" CTA */}
        {phase === 'clue' && (
          <button
            onClick={() => setPhase('prompt')}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-transform shadow-lg"
          >
            I'm here →
          </button>
        )}

        {/* PROMPT phase */}
        {phase === 'prompt' && currentStop && (
          <div className="space-y-4">
            {/* Task header */}
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Task</p>
              <h2 className="text-xl font-black leading-tight">{promptActionCopy?.title ?? 'Complete the task'}</h2>
              <p className="text-sm font-semibold leading-snug text-foreground/85">{currentStop.prompt.question}</p>
            </div>

            {/* GUIDE VIEW: cheat sheet + live stream */}
            {isGuide ? (
              <div className="space-y-4">
                <PromptTaskBadge stop={currentStop} />

                {/* Cheat sheet */}
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">🤝 Guide's cheat sheet</p>
                  {currentStop.prompt.correctAnswers && currentStop.prompt.correctAnswers.length > 0 && (
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">Answer: </span>
                      {currentStop.prompt.correctAnswers.join(' / ')}
                    </p>
                  )}
                  {currentStop.parentHint && (
                    <p className="text-sm text-amber-800 leading-relaxed">{currentStop.parentHint}</p>
                  )}
                  {currentStop.reveal?.funFact && (
                    <p className="text-xs text-amber-700 leading-relaxed border-t border-amber-200 pt-2 mt-2">
                      💡 {currentStop.reveal.funFact}
                    </p>
                  )}
                </div>

                {/* Live artifact stream */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Live from the solver →</p>
                  <LiveArtifactStream
                    artifacts={myTeamArtifacts}
                    participants={participants}
                    stopIndex={currentStopIndex}
                  />
                </div>

                {/* Guide can also advance in team_leader mode */}
                {canAdvance() && (
                  <button
                    onClick={() => setPhase('reveal')}
                    className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    Mark step done →
                  </button>
                )}
              </div>
            ) : (
              /* SOLVER VIEW: interactive widgets (ported from HuntPlay lines ~1130-1310) */
              <div className="space-y-4">
                {/* Text input */}
                {currentStop.prompt.kind === 'text' && (
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    autoFocus
                    className="w-full h-12 rounded-2xl border border-border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  />
                )}

                {/* Voice answer */}
                {currentStop.prompt.kind === 'voice_answer' && (
                  <VoiceAnswerInput
                    language="en"
                    initialTranscript={textAnswer}
                    onTranscript={setTextAnswer}
                  />
                )}

                {/* Multiple choice */}
                {currentStop.prompt.kind === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(currentStop.prompt.options ?? []).map(opt => (
                      <button
                        key={opt}
                        onClick={() => setTextAnswer(opt)}
                        className={cn(
                          'w-full h-12 rounded-2xl border-2 text-left px-4 text-sm font-medium transition-all tap-highlight',
                          textAnswer === opt ? 'border-primary bg-primary/8' : 'border-border bg-card',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Photo */}
                {currentStop.prompt.kind === 'photo' && (
                  <div className="space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoPick} className="hidden" />
                    {photoDataUrl ? (
                      <div className="relative rounded-2xl overflow-hidden">
                        <img src={photoDataUrl} alt="" className="w-full aspect-[4/3] object-cover" />
                        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md">Retake</button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 tap-highlight">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Take a photo</p>
                        {currentStop.prompt.photoSubject && <p className="text-xs text-muted-foreground px-4 text-center">{currentStop.prompt.photoSubject}</p>}
                      </button>
                    )}
                  </div>
                )}

                {/* Spot photo */}
                {currentStop.prompt.kind === 'spot_photo' && (
                  <div className="space-y-3">
                    {currentStop.prompt.referenceImage && (
                      <div className="rounded-2xl overflow-hidden border-2 border-amber-300 bg-amber-50/30 shadow-sm">
                        <div className="px-3 pt-2.5 pb-2 bg-amber-100/80 border-b border-amber-200 flex items-center gap-2">
                          <Target className="w-4 h-4 text-amber-700 shrink-0" />
                          <p className="text-xs font-bold uppercase tracking-widest text-amber-800 flex-1">Find this!</p>
                          <span className="text-[10px] text-amber-700/80 font-medium">Reference</span>
                        </div>
                        <img src={currentStop.prompt.referenceImage} alt="Find this thing" className="w-full aspect-[4/3] object-cover" />
                        {currentStop.prompt.photoSubject && (
                          <p className="px-3 py-2 text-xs text-muted-foreground border-t border-amber-200 bg-amber-50/40">💡 {currentStop.prompt.photoSubject}</p>
                        )}
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoPick} className="hidden" />
                    {photoDataUrl ? (
                      <div className="relative rounded-2xl overflow-hidden">
                        <img src={photoDataUrl} alt="Your photo" className="w-full aspect-[4/3] object-cover" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">Your photo ✓</span>
                        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md">Retake</button>
                        <button onClick={() => setPhotoDataUrl(null)} className="absolute bottom-2 left-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md">Remove</button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="w-full h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 tap-highlight">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Take a photo (optional)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Audio recorder */}
                {currentStop.prompt.kind === 'audio' && (
                  <AudioRecorder
                    maxSeconds={currentStop.prompt.audioMaxSeconds ?? 5}
                    subject={currentStop.prompt.audioSubject}
                    initialDataUrl={audioDataUrl ?? undefined}
                    onReady={(url, dur) => { setAudioDataUrl(url); setAudioDurationMs(dur); }}
                    onClear={() => { setAudioDataUrl(null); setAudioDurationMs(0); }}
                  />
                )}

                {/* Drawing pad */}
                {currentStop.prompt.kind === 'drawing' && (
                  <DrawingPad
                    subject={currentStop.prompt.drawingSubject}
                    initialDataUrl={drawingDataUrl ?? undefined}
                    onChange={(url) => setDrawingDataUrl(url)}
                  />
                )}

                {/* Time-travel camera */}
                {currentStop.prompt.kind === 'time_travel_photo' && (
                  <TimeTravelCamera
                    overlayImageUrl={currentStop.prompt.timeTravelImageUrl}
                    caption={currentStop.prompt.timeTravelCaption}
                    opacity={currentStop.prompt.timeTravelOpacity ?? 0.5}
                    initialDataUrl={timeTravelPhotoDataUrl ?? undefined}
                    onCapture={setTimeTravelPhotoDataUrl}
                  />
                )}

                {/* Observation */}
                {currentStop.prompt.kind === 'observation' && (
                  <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                    Just observe — no need to type anything. Tap "Done" when you've done it.
                  </div>
                )}

                {/* Submit row */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setPhase('reveal')}
                    className="h-12 px-4 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center gap-1.5"
                  >
                    <SkipForward className="w-4 h-4" /> Skip
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={submitting}
                    className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : (
                      <>
                        {currentStop.prompt.kind === 'observation'
                          ? 'Done'
                          : currentStop.prompt.kind === 'spot_photo'
                            ? (photoDataUrl ? 'Found it! Save photo' : 'Found it!')
                            : 'Submit'}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REVEAL phase */}
        {phase === 'reveal' && currentStop && (
          <div className="space-y-4">
            {/* Result badge */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex items-center gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black shadow-sm">✓</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Step {currentStopIndex + 1}/{totalStops} complete</p>
                <p className="text-sm font-semibold text-emerald-800">{currentStop.title} saved!</p>
              </div>
            </div>

            {/* Fun fact / reveal */}
            {currentStop.reveal?.funFact && (
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">✨ Did you know?</p>
                <p className="text-sm text-sky-900 leading-relaxed">{currentStop.reveal.funFact}</p>
              </div>
            )}

            {/* Team artifacts at this stop */}
            {myTeamArtifacts.filter(a => a.stopIndex === currentStopIndex).length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Your memories this step</p>
                <LiveArtifactStream
                  artifacts={myTeamArtifacts}
                  participants={participants}
                  stopIndex={currentStopIndex}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sticky bottom: Next clue button ──────────────────────────── */}
      {showNext && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            onClick={handleNext}
            disabled={advancing}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-all shadow-lg disabled:opacity-60"
          >
            {advancing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Going to next…</>
            ) : isLastStop ? (
              '🎉 Finish game'
            ) : (
              <>Next clue <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
