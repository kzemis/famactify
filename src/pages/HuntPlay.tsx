import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Locate, ChevronRight, Camera, SkipForward, Trophy, RotateCcw, Share2 } from 'lucide-react';
import { huntsService, type ScavengerHunt, type HuntAttempt, type HuntStopResult } from '@/services/huntsService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ARRIVAL_RADIUS_M = 80; // GPS slack for "I'm here"

export default function HuntPlay() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const profileId = currentProfile?.id ?? 'parent-default';

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [attempt, setAttempt] = useState<HuntAttempt | null>(null);
  const [phase, setPhase] = useState<'clue' | 'prompt' | 'reveal' | 'finished'>('clue');
  const [textAnswer, setTextAnswer] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load hunt + attempt on mount
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const h = await huntsService.getHunt(slug);
      if (!h) { navigate('/hunts'); return; }
      setHunt(h);
      const a = huntsService.startAttempt(h.id, profileId);
      setAttempt(a);
      // If completed, jump straight to summary
      if (a.completedAt) setPhase('finished');
    })();
  }, [slug, profileId, navigate]);

  if (!hunt || !attempt) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isFinished = phase === 'finished' || attempt.currentStopOrder >= hunt.stops.length;
  const currentStop = isFinished ? null : hunt.stops[attempt.currentStopOrder];
  const totalStops = hunt.stops.length;
  const progress = isFinished ? 1 : attempt.currentStopOrder / totalStops;

  const handleLocate = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      (err) => { setLocating(false); toast.error(err.message || 'Could not get your location'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const distanceToCurrent = userLocation && currentStop
    ? huntsService.distanceMeters(userLocation, { lat: currentStop.lat, lon: currentStop.lon })
    : null;
  const isAtStop = distanceToCurrent != null && distanceToCurrent <= ARRIVAL_RADIUS_M;

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitAnswer = () => {
    if (!currentStop || !attempt) return;

    const result: HuntStopResult = {
      stopId: currentStop.id,
      answeredAt: new Date().toISOString(),
      answer: '',
    };

    if (currentStop.prompt.kind === 'text') {
      const a = textAnswer.trim().toLowerCase();
      if (!a) { toast.error('Type an answer first'); return; }
      result.answer = textAnswer.trim();
      result.isCorrect = (currentStop.prompt.correctAnswers ?? []).some(c => a.includes(c.toLowerCase()));
    } else if (currentStop.prompt.kind === 'multiple_choice') {
      if (!textAnswer) { toast.error('Pick one'); return; }
      result.answer = textAnswer;
      result.isCorrect = (currentStop.prompt.correctAnswers ?? []).some(c => c.toLowerCase() === textAnswer.toLowerCase());
    } else if (currentStop.prompt.kind === 'photo') {
      if (!photoDataUrl) { toast.error('Add a photo first'); return; }
      result.answer = '(photo)';
      result.photoDataUrl = photoDataUrl;
      result.isCorrect = true; // photos are always accepted
    } else {
      // observation — just acknowledge
      result.answer = '✓';
      result.isCorrect = true;
    }

    const updated = huntsService.recordStop(attempt.id, result, /* advance */ false);
    if (updated) setAttempt(updated);
    setPhase('reveal');
  };

  const skipStop = () => {
    if (!currentStop || !attempt) return;
    const result: HuntStopResult = {
      stopId: currentStop.id,
      answeredAt: new Date().toISOString(),
      answer: '',
      skipped: true,
    };
    const updated = huntsService.recordStop(attempt.id, result, false);
    if (updated) setAttempt(updated);
    setPhase('reveal');
  };

  const next = () => {
    if (!attempt || !hunt) return;
    // advance the pointer in storage now (we recorded the result without advancing)
    const advanced = huntsService.recordStop(
      attempt.id,
      { stopId: hunt.stops[attempt.currentStopOrder].id, answeredAt: new Date().toISOString(), answer: '__advance__' },
      true,
    );
    if (!advanced) return;
    // overwrite the spurious __advance__ result we just used to advance
    const cleaned: HuntAttempt = {
      ...advanced,
      results: advanced.results.filter(r => r.answer !== '__advance__'),
    };
    setAttempt(cleaned);
    setTextAnswer('');
    setPhotoDataUrl(null);
    if (cleaned.currentStopOrder >= hunt.stops.length) {
      const completed = huntsService.completeAttempt(cleaned.id);
      if (completed) setAttempt(completed);
      setPhase('finished');
    } else {
      setPhase('clue');
    }
  };

  // ── Render: finished summary ────────────────────────────────────────────────

  if (isFinished) {
    const correct = attempt.results.filter(r => r.isCorrect && !r.skipped).length;
    const photos = attempt.results.filter(r => r.photoDataUrl).map(r => r.photoDataUrl!);
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-pink-50 to-purple-50 pb-tab-bar">
        <div className="px-6 pt-12 pb-6 text-center space-y-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 32px)' }}>
          <div className="inline-flex w-20 h-20 rounded-full bg-amber-400/30 items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">You did it!</h1>
          <p className="text-sm text-muted-foreground">
            {hunt.title} · {currentProfile?.name ?? 'Explorer'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
            ✓ {correct} of {totalStops} stops solved
          </div>
        </div>

        {photos.length > 0 && (
          <div className="px-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Memories</p>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, i) => (
                <img key={i} src={p} alt="" className="rounded-2xl w-full aspect-square object-cover shadow-sm" />
              ))}
            </div>
          </div>
        )}

        <div className="px-5 pt-6 space-y-3">
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `We finished ${hunt.title}!`,
                  text: `${currentProfile?.name ?? 'We'} just completed the FamActify hunt: ${hunt.title}.`,
                  url: window.location.origin + `/hunts/${hunt.slug}`,
                }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.origin + `/hunts/${hunt.slug}`);
                toast.success('Link copied');
              }
            }}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold tap-highlight flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share with the family
          </button>
          <button
            onClick={() => navigate('/saved-trips')}
            className="w-full h-11 rounded-2xl bg-muted text-foreground text-sm font-medium tap-highlight flex items-center justify-center gap-2"
          >
            View memories in Trips
          </button>
          <button
            onClick={() => {
              if (window.confirm('Play this hunt again from the start?')) {
                huntsService.abandonAttempt(attempt.id);
                navigate(`/hunts/${hunt.slug}/play`, { replace: true });
                window.location.reload();
              }
            }}
            className="w-full h-11 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
          <button
            onClick={() => navigate('/hunts')}
            className="w-full h-11 rounded-2xl text-sm text-muted-foreground tap-highlight"
          >
            See more hunts
          </button>
        </div>
      </div>
    );
  }

  // ── Render: clue / prompt / reveal phases ───────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-tab-bar">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <button onClick={() => navigate(`/hunts/${hunt.slug}`)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight" aria-label="Back to hunt">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Stop {attempt.currentStopOrder + 1} of {totalStops}</p>
          <p className="text-sm font-semibold truncate">{currentStop?.title}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* CLUE phase */}
        {phase === 'clue' && currentStop && (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-pink-50 border p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{currentStop.order + 1}</div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Clue</span>
              </div>
              <p className="text-base leading-relaxed">{currentStop.clueText}</p>
              {currentStop.address && (
                <div className="flex items-start gap-2 text-sm pt-2 border-t border-border/40">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{currentStop.address}</span>
                </div>
              )}
            </div>

            {/* GPS check */}
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Are you there yet?</p>
                {distanceToCurrent != null && (
                  <span className={cn('text-xs font-medium', isAtStop ? 'text-emerald-600' : 'text-muted-foreground')}>
                    {isAtStop ? '✓ You\'re close enough' : `${Math.round(distanceToCurrent)}m away`}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleLocate}
                  disabled={locating}
                  className="flex-1 h-11 rounded-xl bg-muted text-foreground text-sm font-medium tap-highlight flex items-center justify-center gap-2"
                >
                  <Locate className="w-4 h-4" />
                  {locating ? 'Locating…' : userLocation ? 'Update location' : 'Check my location'}
                </button>
                <button
                  onClick={() => setPhase('prompt')}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center gap-2"
                >
                  I'm here <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                You can also tap "I'm here" without GPS — we trust you.
              </p>
            </div>
          </>
        )}

        {/* PROMPT phase */}
        {phase === 'prompt' && currentStop && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Question</p>
              <h2 className="text-xl font-bold leading-tight">{currentStop.prompt.question}</h2>
            </div>

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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoPick}
                  className="hidden"
                />
                {photoDataUrl ? (
                  <div className="relative rounded-2xl overflow-hidden">
                    <img src={photoDataUrl} alt="" className="w-full aspect-[4/3] object-cover" />
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md">Retake</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 tap-highlight"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Take a photo</p>
                    {currentStop.prompt.photoSubject && (
                      <p className="text-xs text-muted-foreground px-4 text-center">{currentStop.prompt.photoSubject}</p>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Observation — no input */}
            {currentStop.prompt.kind === 'observation' && (
              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                Just observe — no need to type anything. Tap "Done" when you've done it.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={skipStop} className="h-12 px-4 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center gap-1.5">
                <SkipForward className="w-4 h-4" /> Skip
              </button>
              <button onClick={submitAnswer} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center gap-1.5">
                {currentStop.prompt.kind === 'observation' ? 'Done' : 'Submit'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* REVEAL phase */}
        {phase === 'reveal' && currentStop && (() => {
          const lastResult = attempt.results.find(r => r.stopId === currentStop.id);
          const wasSkipped = lastResult?.skipped;
          const wasCorrect = lastResult?.isCorrect && !wasSkipped;
          return (
            <div className="space-y-4">
              <div className={cn(
                'rounded-2xl p-4 flex items-start gap-3',
                wasSkipped ? 'bg-muted text-muted-foreground' : wasCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
              )}>
                <span className="text-2xl shrink-0">{wasSkipped ? '⏭️' : wasCorrect ? '✓' : '🤔'}</span>
                <div>
                  <p className="font-semibold text-sm">
                    {wasSkipped ? 'Skipped' : wasCorrect ? 'Correct!' : 'Not quite — but here\'s the answer'}
                  </p>
                  {!wasSkipped && lastResult?.answer && lastResult.answer !== '✓' && lastResult.answer !== '(photo)' && (
                    <p className="text-xs mt-0.5">Your answer: {lastResult.answer}</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-amber-50 border p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Did you know?</p>
                <p className="text-base leading-relaxed">{currentStop.reveal.funFact}</p>
              </div>

              <button onClick={next} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold tap-highlight flex items-center justify-center gap-2">
                {attempt.currentStopOrder + 1 >= totalStops ? 'Finish hunt' : 'Next stop'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
