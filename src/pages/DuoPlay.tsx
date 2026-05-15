// DuoPlay — synchronized play screen for two-phone parent+kid mode.
//
// Both phones show the SAME hunt at the SAME stop, but with role-specific UI:
//   - Parent (parent_guide): clue text + answer cheat sheet + "Next clue" advance button
//   - Kid    (kid_solver):   clue text + a fun "ready to solve!" panel; no answer, no advance
// When parent advances, the Realtime subscription on hunt_race_participants pushes the
// new current_stop to the kid's phone immediately.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, MapPin, Eye, EyeOff, Sparkles, Trophy, Loader2, Volume2, VolumeX } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import { raceService } from '@/services/raceService';
import { supabase } from '@/integrations/supabase/client';
import type { HuntRace, RaceParticipant, ScavengerHunt, HuntStop } from '@/types/hunt';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ParticipantAvatar from '@/components/ParticipantAvatar';

export default function DuoPlay() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [session, setSession] = useState<HuntRace | null>(null);
  const [me, setMe] = useState<RaceParticipant | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await raceService.getRace(sessionId);
        if (!s) { toast.error('Session not found'); navigate('/hunts'); return; }
        if (s.mode !== 'duo') { toast.error('Not a duo session'); navigate(`/race/${s.id}/play`); return; }
        if (cancelled) return;
        setSession(s);

        const huntRow = await huntsService.getHuntById(s.huntId).catch(() => null);
        if (!huntRow) { toast.error('City game missing'); navigate('/hunts'); return; }
        if (cancelled) return;
        setHunt(huntRow);

        const { participant } = await raceService.getMyParticipant(s.id);
        if (cancelled) return;
        setMe(participant);

        const list = await raceService.getParticipants(s.id);
        if (cancelled) return;
        setParticipants(list);
      } catch (e: any) {
        console.error('[DuoPlay load]', e);
        toast.error(e?.message ?? 'Could not load session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, navigate]);

  // ── Realtime sync — both phones see same currentStop ─────────────────────
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`duo-play-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hunt_race_participants',
        filter: `race_id=eq.${session.id}`,
      }, async () => {
        const list = await raceService.getParticipants(session.id);
        setParticipants(list);
        const myEntry = list.find(p => p.userId === me?.userId);
        if (myEntry) setMe(myEntry);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hunt_races',
        filter: `id=eq.${session.id}`,
      }, async () => {
        const s = await raceService.getRace(session.id);
        if (s) setSession(s);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.id, me?.userId]);

  // ── Stop TTS on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  // Auto-jump to results when session is finished
  useEffect(() => {
    if (session?.status === 'finished') {
      navigate(`/duo/${session.id}/results`);
    }
  }, [session?.status, session?.id, navigate]);

  if (loading || !hunt || !session || !me) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isGuide = me.role === 'parent_guide';
  const totalStops = hunt.stops.length;
  const currentIdx = me.currentStop ?? 0;
  const isFinished = currentIdx >= totalStops;
  const currentStop: HuntStop | null = isFinished ? null : hunt.stops[currentIdx];
  const partner = participants.find(p => p.userId !== me.userId);
  const partnerJoined = !!partner;

  const handleAdvance = async () => {
    if (!isGuide || advancing) return;
    setAdvancing(true);
    try {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      await raceService.advanceDuoStop(session.id, currentIdx + 1, totalStops);
      // Realtime will push the change; updating local state is just instant feedback
      setMe(prev => prev ? { ...prev, currentStop: currentIdx + 1 } : prev);
    } catch (e: any) {
      console.error('[DuoPlay advance]', e);
      toast.error(e?.message ?? 'Could not advance');
    } finally {
      setAdvancing(false);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };

  // ── Finished view ────────────────────────────────────────────────────────
  if (isFinished || !currentStop) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-pink-50 to-purple-50 flex flex-col items-center justify-center px-6 text-center gap-4 pb-tab-bar">
        <div className="inline-flex w-20 h-20 rounded-full bg-amber-400/30 items-center justify-center">
          <Trophy className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">City game complete!</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You did it together — every stop solved as a team. Great teamwork!
        </p>
        <button
          onClick={() => navigate('/hunts')}
          className="h-12 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight"
        >
          See more city games
        </button>
      </div>
    );
  }

  // Friendly answer summary depending on prompt kind
  const answerSummary = ((): string => {
    const p = currentStop.prompt;
    if (p.kind === 'text' || p.kind === 'voice_answer') {
      return (p.correctAnswers ?? []).join(' / ') || '(any reasonable answer)';
    }
    if (p.kind === 'multiple_choice') {
      return (p.correctAnswers ?? []).join(', ') || '(see options)';
    }
    if (p.kind === 'photo') return p.photoSubject ?? 'Take a photo of the subject';
    if (p.kind === 'spot_photo') return p.photoSubject ?? 'Find the thing in the reference photo';
    if (p.kind === 'audio') return p.audioSubject ?? 'Record the sound';
    if (p.kind === 'drawing') return p.drawingSubject ?? 'Draw it';
    if (p.kind === 'time_travel_photo') return 'Line up the historical photo with today';
    return 'Just acknowledge the clue';
  })();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-tab-bar">
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}
      >
        <button
          onClick={() => {
            if (window.confirm('Leave the duo session? Your partner can continue solo.')) {
              navigate('/hunts');
            }
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight"
          aria-label="Leave session"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {isGuide ? '🧑‍🏫 Guide · two-phone' : '🧒 Solver · two-phone'} · stop {currentIdx + 1} / {totalStops}
          </p>
          <p className="text-sm font-semibold truncate">{hunt.title}</p>
        </div>
      </div>

      {/* Stamp-dot progress row */}
      <div className="bg-background/95 backdrop-blur border-b border-border/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2">
        {hunt.stops.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300',
              i < currentIdx
                ? 'bg-emerald-500 text-white'
                : i === currentIdx
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/40 animate-pulse'
                  : 'bg-muted/40 text-muted-foreground/40 border border-dashed border-border/50',
            )}
          >
            {i < currentIdx ? '✓' : i + 1}
          </div>
        ))}
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* Partner status */}
        <div className="rounded-2xl bg-muted/30 border px-3 py-2 flex items-center gap-2 text-xs">
          <div className="w-7 h-7 shrink-0">
            {partner ? (
              <ParticipantAvatar p={partner} size={28} />
            ) : (
              <div className="w-7 h-7 rounded-full bg-card flex items-center justify-center text-base">👤</div>
            )}
          </div>
          <span className="flex-1 min-w-0 truncate">
            {partnerJoined ? (
              <>
                <span className="font-semibold">{partner!.familyName}</span>
                <span className="text-muted-foreground"> · {partner!.role === 'parent_guide' ? 'guide' : partner!.role === 'kid_solver' ? 'solver' : 'player'}</span>
              </>
            ) : (
              <span className="text-muted-foreground italic">Waiting for partner…</span>
            )}
          </span>
          <span className={cn('w-2 h-2 rounded-full', partnerJoined ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
        </div>

        {/* Clue card */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-pink-50 border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
              {currentIdx + 1}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
              {isGuide ? 'Read this aloud' : 'Listen to your parent'}
            </span>
            <button
              onClick={() => speak(currentStop.clueText)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center tap-highlight',
                speaking ? 'bg-primary text-primary-foreground' : 'bg-background border border-border',
              )}
              aria-label={speaking ? 'Stop reading' : 'Read aloud'}
            >
              {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-base leading-relaxed font-medium">{currentStop.clueText}</p>
          {currentStop.address && (
            <div className="flex items-start gap-2 pt-2 border-t border-border/40">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">{currentStop.address}</span>
            </div>
          )}
          <h3 className="text-base font-bold leading-snug pt-1">{currentStop.prompt.question}</h3>
        </div>

        {/* GUIDE-only: cheat sheet */}
        {isGuide && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 flex-1">Cheat sheet — for your eyes only</p>
              <button
                onClick={() => setShowAnswer(s => !s)}
                className="text-[11px] font-semibold text-amber-700 tap-highlight flex items-center gap-1"
              >
                {showAnswer ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
              </button>
            </div>
            {showAnswer ? (
              <p className="text-base font-bold text-amber-900 leading-snug break-words">
                {answerSummary}
              </p>
            ) : (
              <p className="text-sm text-amber-700 italic">Answer hidden</p>
            )}
            {currentStop.parentHint && (
              <div className="pt-2 border-t border-amber-200/70">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">Hint to whisper</p>
                <p className="text-sm text-amber-900 leading-snug">{currentStop.parentHint}</p>
              </div>
            )}
            {currentStop.reveal.funFact && (
              <div className="pt-2 border-t border-amber-200/70">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">Reveal after solving</p>
                <p className="text-sm text-amber-900 leading-snug">{currentStop.reveal.funFact}</p>
              </div>
            )}
          </div>
        )}

        {/* SOLVER-only: encouragement panel (no answer!) */}
        {!isGuide && (
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-6 text-center space-y-2">
            <div className="text-5xl">🧠</div>
            <p className="font-black text-base">Your turn!</p>
            <p className="text-sm text-emerald-800 leading-snug">
              Listen to your parent reading the clue. Look around, think hard, and tell them your answer.
            </p>
            <p className="text-[11px] text-emerald-700 mt-2 italic">
              When you've solved it, your parent taps "Next clue" and a new clue appears here.
            </p>
          </div>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div
        className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-5 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        {isGuide ? (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold tap-highlight active:scale-[0.99] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {advancing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
            {advancing ? 'Advancing…' : currentIdx + 1 === totalStops ? 'Finish city game' : 'Solved! Next clue'}
          </button>
        ) : (
          <div className="w-full h-14 rounded-2xl bg-muted text-muted-foreground font-medium flex items-center justify-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for parent to advance…
          </div>
        )}
      </div>
    </div>
  );
}
