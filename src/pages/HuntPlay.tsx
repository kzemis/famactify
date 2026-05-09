import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Locate, ChevronRight, Camera, SkipForward, RotateCcw, Share2, Volume2, VolumeX, HelpCircle, Mic, Pencil, Play, Download, History, Navigation, Headphones, Loader2, Target, Pause, Square, BookOpen } from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import VoiceAnswerInput from '@/components/VoiceAnswerInput';
import ARClueOverlay from '@/components/ARClueOverlay';
import DrawingPad from '@/components/DrawingPad';
import TimeTravelCamera from '@/components/TimeTravelCamera';
import { renderHuntPostcard } from '@/lib/huntPostcard';
import { huntsService, type HuntAttempt, type HuntStopResult } from '@/services/huntsService';
import type { HuntPromptKind } from '@/types/hunt';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { useHunt } from '@/hooks/useHunt';
import { toast } from 'sonner';

const ARRIVAL_RADIUS_M = 80; // GPS slack for "I'm here"

function formatGuideTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

function getPromptActionCopy(kind: HuntPromptKind): { title: string; cta: string } {
  switch (kind) {
    case 'time_travel_photo':
      return { title: 'Add now photo to history photo', cta: 'Open timeline camera' };
    case 'photo':
      return { title: 'Take a photo', cta: 'Open camera' };
    case 'spot_photo':
      return { title: 'Find the detail', cta: 'Start looking' };
    case 'audio':
      return { title: 'Record a sound', cta: 'Record now' };
    case 'drawing':
      return { title: 'Draw what you see', cta: 'Open drawing' };
    case 'voice_answer':
      return { title: 'Say the answer', cta: 'Answer aloud' };
    case 'multiple_choice':
      return { title: 'Pick the answer', cta: 'Answer now' };
    case 'observation':
      return { title: 'Notice and confirm', cta: 'I noticed it' };
    case 'text':
    default:
      return { title: 'Answer the question', cta: 'Answer now' };
  }
}

export interface HuntProgressSnapshot {
  currentStopOrder: number;
  totalStops: number;
  score: number;
  completed: boolean;
}

interface HuntPlayProps {
  huntSlug?: string;
  raceOverlay?: ReactNode;
  onRaceProgress?: (snapshot: HuntProgressSnapshot) => void | Promise<void>;
}

export default function HuntPlay({ huntSlug, raceOverlay, onRaceProgress }: HuntPlayProps = {}) {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const activeSlug = huntSlug ?? routeSlug;
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const { language } = useLanguage();
  const profileId = currentProfile?.id ?? 'parent-default';

  const { data: hunt = null, isLoading: huntLoading, isFetched: huntFetched } = useHunt(activeSlug);
  const huntId = hunt?.id;
  const [attempt, setAttempt] = useState<HuntAttempt | null>(null);
  const [phase, setPhase] = useState<'clue' | 'prompt' | 'reveal' | 'finished'>('clue');
  const [textAnswer, setTextAnswer] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number>(0);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [timeTravelPhotoDataUrl, setTimeTravelPhotoDataUrl] = useState<string | null>(null);
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);
  const [postcardBlob, setPostcardBlob] = useState<Blob | null>(null);
  const [postcardLoading, setPostcardLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showARGuide, setShowARGuide] = useState(false);
  const [showParentHint, setShowParentHint] = useState(false);
  const [stopLanguage, setStopLanguage] = useState<'en' | 'lv'>(language === 'lv' ? 'lv' : 'en');
  const [speaking, setSpeaking] = useState(false);
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [skippingStop, setSkippingStop] = useState(false);
  const [advancingStop, setAdvancingStop] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [audioGuideOpen, setAudioGuideOpen] = useState(false);
  const [audioGuidePlaying, setAudioGuidePlaying] = useState(false);
  const [audioGuideProgress, setAudioGuideProgress] = useState(0);
  const [audioGuideDuration, setAudioGuideDuration] = useState(0);
  const [audioGuideVolume, setAudioGuideVolume] = useState(1);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [finishedSlide, setFinishedSlide] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioGuideRef = useRef<HTMLAudioElement>(null);
  const finishedCarouselRef = useRef<HTMLDivElement>(null);

  // Load attempt after the cached hunt is available.
  useEffect(() => {
    if (!activeSlug || huntLoading) return;
    if (huntFetched && !huntId) {
      navigate('/hunts', { replace: true });
      return;
    }
    if (!huntId) return;
    let cancelled = false;
    setAttempt(null);
    setPhase('clue');
    (async () => {
      const a = await huntsService.startAttempt(huntId, profileId);
      if (cancelled) return;
      setAttempt(a);
      // If completed, jump straight to summary
      if (a.completedAt) setPhase('finished');
    })();
    return () => { cancelled = true; };
  }, [activeSlug, huntId, huntFetched, huntLoading, profileId, navigate]);

  // Stop any ongoing TTS when leaving the page.
  // Keep this before early returns so React sees the same hook order every render.
  useEffect(() => {
    return () => { try { window.speechSynthesis?.cancel(); } catch {} };
  }, []);

  // Render the postcard once when the hunt finishes.
  useEffect(() => {
    if (phase !== 'finished' || !hunt || !attempt) return;
    if (postcardUrl || postcardLoading) return;
    let cancelled = false;
    setPostcardLoading(true);
    (async () => {
      try {
        const blob = await renderHuntPostcard({
          hunt,
          attempt,
          profileName: currentProfile?.name ?? 'Explorer',
        });
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        setPostcardBlob(blob);
        setPostcardUrl(url);
      } catch (e) {
        console.warn('[postcard render]', e);
      } finally {
        if (!cancelled) setPostcardLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, hunt?.id, attempt?.id]);

  // Revoke the object URL on unmount.
  useEffect(() => {
    return () => { if (postcardUrl) URL.revokeObjectURL(postcardUrl); };
  }, [postcardUrl]);

  // Reset expanded clue audio when moving to another stop.
  useEffect(() => {
    const audio = audioGuideRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudioGuideOpen(false);
    setAudioGuidePlaying(false);
    setAudioGuideProgress(0);
    setAudioGuideDuration(0);
    setShowLocationMenu(false);
  }, [attempt?.currentStopOrder, huntId]);

  if (huntLoading || !hunt || !attempt) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isFinished = phase === 'finished' || attempt.currentStopOrder >= hunt.stops.length;
  const currentStop = isFinished ? null : hunt.stops[attempt.currentStopOrder];
  const totalStops = hunt.stops.length;
  const hasLatvianCopy = !!(currentStop?.clueTextLv || currentStop?.reveal.funFactLv);
  const activeStopLanguage = stopLanguage === 'lv' && hasLatvianCopy ? 'lv' : 'en';
  const hasStopCoordinates = !!currentStop
    && typeof currentStop.lat === 'number'
    && Number.isFinite(currentStop.lat)
    && typeof currentStop.lon === 'number'
    && Number.isFinite(currentStop.lon);
  const displayedClueText = currentStop
    ? activeStopLanguage === 'lv'
      ? currentStop.clueTextLv || currentStop.clueText || 'Head to this stop, then complete the action.'
      : currentStop.clueText || 'Head to this stop, then complete the action.'
    : '';
  const displayedFunFact = currentStop
    ? activeStopLanguage === 'lv'
      ? currentStop.reveal.funFactLv || currentStop.reveal.funFact
      : currentStop.reveal.funFact
    : '';
  const promptActionCopy = currentStop ? getPromptActionCopy(currentStop.prompt.kind) : null;

  // ── Voice-over (Web Speech API) ──
  const speak = (text: string, lang: 'en' | 'lv' = activeStopLanguage) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Voice-over not supported in this browser');
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'lv' ? 'lv-LV' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); // clear any queued speech
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  const handleLocate = () => {
    if (!currentStop || !hasStopCoordinates) {
      toast.message('This stop has no map pin yet — use manual check-in.');
      return;
    }
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(nextLocation);
        setLocating(false);
        const distance = huntsService.distanceMeters(nextLocation, { lat: currentStop.lat as number, lon: currentStop.lon as number });
        if (distance <= ARRIVAL_RADIUS_M) {
          toast.success('GPS check-in complete');
          setPhase('prompt');
        } else {
          toast.message(`${Math.round(distance)}m away — move closer or tap “I'm here”`);
        }
      },
      (err) => { setLocating(false); toast.error(err.message || 'Could not get your location'); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const openMapsNavigation = () => {
    if (!currentStop) return;
    const destination = hasStopCoordinates
      ? `${currentStop.lat},${currentStop.lon}`
      : currentStop.address || currentStop.title;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const toggleAudioGuide = async () => {
    const audio = audioGuideRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        toast.error('Audio could not start');
      }
    } else {
      audio.pause();
    }
  };

  const stopAudioGuide = () => {
    const audio = audioGuideRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setAudioGuideProgress(0);
    setAudioGuidePlaying(false);
  };

  const distanceToCurrent = userLocation && currentStop && hasStopCoordinates
    ? huntsService.distanceMeters(userLocation, { lat: currentStop.lat as number, lon: currentStop.lon as number })
    : null;
  const isAtStop = distanceToCurrent != null && distanceToCurrent <= ARRIVAL_RADIUS_M;

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitAnswer = async () => {
    if (!currentStop || !attempt || submittingAnswer) return;

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
    } else if (currentStop.prompt.kind === 'voice_answer') {
      const a = textAnswer.trim().toLowerCase();
      if (!a) { toast.error('Speak or type an answer first'); return; }
      result.answer = textAnswer.trim();
      // Same contains-match against correctAnswers — speech-to-text often has minor variations
      result.isCorrect = (currentStop.prompt.correctAnswers ?? []).some(c => a.includes(c.toLowerCase()));
    } else if (currentStop.prompt.kind === 'multiple_choice') {
      if (!textAnswer) { toast.error('Pick one'); return; }
      result.answer = textAnswer;
      result.isCorrect = (currentStop.prompt.correctAnswers ?? []).some(c => c.toLowerCase() === textAnswer.toLowerCase());
    } else if (currentStop.prompt.kind === 'photo') {
      if (!photoDataUrl) { toast.error('Add a photo first'); return; }
      result.answer = '(photo)';
      result.photoDataUrl = photoDataUrl;
      result.isCorrect = true; // photos are always accepted as a completion
      setVerifyingPhoto(true);
      try {
        const v = await huntsService.verifyPhotoML(photoDataUrl, currentStop.prompt.photoSubject);
        result.photoVerified = v.verified;
        result.photoVerifyConfidence = v.confidence;
        result.photoNeedsReview = !!v.needsReview;
        result.photoReviewStatus = v.needsReview ? 'pending' : v.verified ? 'approved' : 'rejected';
        result.photoReviewNotes = v.reason ? `${v.reason}${v.model ? ` (${v.model})` : ''}` : undefined;
      } catch {
        result.photoVerified = undefined;
        result.photoNeedsReview = true;
        result.photoReviewStatus = 'pending';
        result.photoReviewNotes = 'Photo verification unavailable; queued for manual review.';
      } finally {
        setVerifyingPhoto(false);
      }
    } else if (currentStop.prompt.kind === 'audio') {
      if (!audioDataUrl) { toast.error('Record a sound first'); return; }
      result.answer = '(audio)';
      result.audioDataUrl = audioDataUrl;
      result.audioDurationMs = audioDurationMs;
      result.isCorrect = true; // sound clips are always accepted as a completion
    } else if (currentStop.prompt.kind === 'drawing') {
      if (!drawingDataUrl) { toast.error('Draw something first'); return; }
      result.answer = '(drawing)';
      result.drawingDataUrl = drawingDataUrl;
      result.isCorrect = true; // drawings are always accepted as a completion
    } else if (currentStop.prompt.kind === 'time_travel_photo') {
      if (!timeTravelPhotoDataUrl) { toast.error('Line up and capture the time-travel photo first'); return; }
      result.answer = '(time-travel-photo)';
      result.photoDataUrl = timeTravelPhotoDataUrl;
      result.isCorrect = true; // time-travel photos are memory captures, not quizzes
    } else if (currentStop.prompt.kind === 'spot_photo') {
      // Photo is OPTIONAL — kid can confirm "Found it!" without taking one
      result.answer = photoDataUrl ? '(spot-photo)' : '(spotted)';
      result.isCorrect = true;
      if (photoDataUrl) {
        result.photoDataUrl = photoDataUrl;
        // Future: ML matching against currentStop.prompt.referenceImage
        result.photoNeedsReview = true;
        result.photoReviewStatus = 'pending';
        result.photoReviewNotes = 'Awaiting reference-photo match check.';
      }
    } else {
      // observation — just acknowledge
      result.answer = '✓';
      result.isCorrect = true;
    }

    setSubmittingAnswer(true);
    try {
      const updated = await huntsService.recordStop(attempt.id, result, /* advance */ false);
      if (updated) setAttempt(updated);
      setPhase('reveal');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const skipStop = async () => {
    if (!currentStop || !attempt || skippingStop) return;
    const result: HuntStopResult = {
      stopId: currentStop.id,
      answeredAt: new Date().toISOString(),
      answer: '',
      skipped: true,
    };
    setSkippingStop(true);
    try {
      const updated = await huntsService.recordStop(attempt.id, result, false);
      if (updated) setAttempt(updated);
      setPhase('reveal');
    } finally {
      setSkippingStop(false);
    }
  };

  const next = async () => {
    if (!attempt || !hunt || advancingStop) return;
    setAdvancingStop(true);
    try {
      // advance the pointer in storage now (we recorded the result without advancing)
      const advanced = await huntsService.recordStop(
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
      const completedStopCount = Math.min(cleaned.currentStopOrder, hunt.stops.length);
      const score = cleaned.results.filter(r => r.isCorrect && !r.skipped).length;
      try {
        await onRaceProgress?.({
          currentStopOrder: completedStopCount,
          totalStops: hunt.stops.length,
          score,
          completed: completedStopCount >= hunt.stops.length,
        });
      } catch (e) {
        console.warn('[race progress sync]', e);
        toast.error('Race progress could not sync — continuing hunt');
      }
      setAttempt(cleaned);
      setTextAnswer('');
      setPhotoDataUrl(null);
      setAudioDataUrl(null);
      setAudioDurationMs(0);
      setDrawingDataUrl(null);
      setTimeTravelPhotoDataUrl(null);
      setShowARGuide(false);
      setShowParentHint(false);
      try { window.speechSynthesis?.cancel(); } catch {}
      if (cleaned.currentStopOrder >= hunt.stops.length) {
        const completed = await huntsService.completeAttempt(cleaned.id);
        if (completed) setAttempt(completed);
        setPhase('finished');
      } else {
        setPhase('clue');
      }
    } finally {
      setAdvancingStop(false);
    }
  };

  // ── Postcard share / download handlers ─────────────────────────────────────
  const handleSharePostcard = async () => {
    if (!hunt) return;
    if (!postcardBlob) {
      toast.error(postcardLoading ? 'Postcard still rendering…' : 'Couldn\'t prepare postcard');
      return;
    }
    setSharing(true);
    try {
      const fileName = `${hunt.slug}-postcard.png`;
      const file = new File([postcardBlob], fileName, { type: 'image/png' });
      const shareData: ShareData = {
        title: `${currentProfile?.name ?? 'We'} finished ${hunt.title}!`,
        text: `${currentProfile?.name ?? 'We'} just completed the FamActify hunt — walk it yourself: famactify.app/hunts/${hunt.slug}`,
        url: `${window.location.origin}/hunts/${hunt.slug}`,
        files: [file],
      };
      // Web Share API Level 2 — supports files on iOS 15+, Chrome Android, etc.
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.share) {
        // Fallback — share text/link only (no image)
        await navigator.share({ title: shareData.title, text: shareData.text, url: shareData.url });
      } else {
        // Desktop / unsupported — download instead
        handleDownloadPostcard();
        return;
      }
    } catch (e: any) {
      // AbortError = user cancelled the system share sheet — no toast
      if (e?.name !== 'AbortError') {
        console.warn('[postcard share]', e);
        toast.error('Could not share — try the download instead');
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownloadPostcard = () => {
    if (!postcardBlob || !hunt) return;
    const url = URL.createObjectURL(postcardBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hunt.slug}-postcard.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Postcard saved — share it from your photos!');
  };

  const isImmersivePrompt = phase === 'prompt' && currentStop && (
    currentStop.prompt.kind === 'time_travel_photo'
    || currentStop.prompt.kind === 'drawing'
    || currentStop.prompt.kind === 'audio'
  );

  if (isImmersivePrompt && currentStop) {
    const submitLabel = currentStop.prompt.kind === 'time_travel_photo'
      ? 'Use photo'
      : currentStop.prompt.kind === 'drawing'
        ? 'Save drawing'
        : 'Save sound';

    if (currentStop.prompt.kind === 'time_travel_photo') {
      return (
        <div className="fixed inset-0 z-[90] bg-black text-white overflow-hidden">
          {raceOverlay}
          <TimeTravelCamera
            key={currentStop.id}
            immersive
            overlayImageUrl={currentStop.prompt.timeTravelImageUrl}
            caption={currentStop.prompt.timeTravelCaption}
            opacity={currentStop.prompt.timeTravelOpacity ?? 0.5}
            initialDataUrl={timeTravelPhotoDataUrl ?? undefined}
            onCapture={setTimeTravelPhotoDataUrl}
            overlayHeader={(
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPhase('clue')}
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center tap-highlight shrink-0"
                  aria-label="Back to clue"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/65 truncate">Stop {attempt.currentStopOrder + 1} of {totalStops} · {currentStop.title}</p>
                  <h2 className="text-base font-black leading-tight drop-shadow truncate">{promptActionCopy?.title ?? currentStop.title}</h2>
                </div>
              </div>
            )}
            overlayFooter={(
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={skipStop}
                  disabled={skippingStop || submittingAnswer}
                  className="w-12 h-12 rounded-full border border-white/20 bg-black/45 tap-highlight flex items-center justify-center backdrop-blur disabled:opacity-60"
                  aria-label="Skip stop"
                >
                  {skippingStop ? <Loader2 className="w-5 h-5 animate-spin" /> : <SkipForward className="w-5 h-5" />}
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={submittingAnswer || skippingStop}
                  className="w-14 h-14 rounded-full bg-primary text-primary-foreground tap-highlight flex items-center justify-center shadow-xl shadow-primary/30 disabled:opacity-70"
                  aria-label="Use photo"
                >
                  {submittingAnswer ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-7 h-7" />}
                </button>
              </div>
            )}
          />
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[90] bg-black text-white flex flex-col overflow-hidden">
        {raceOverlay}
        <div
          className="shrink-0 px-4 pb-3 bg-black/70 backdrop-blur border-b border-white/10"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPhase('clue')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center tap-highlight"
              aria-label="Back to clue"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/55">Stop {attempt.currentStopOrder + 1} of {totalStops}</p>
              <p className="text-sm font-bold truncate">{promptActionCopy?.title ?? currentStop.title}</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-white/60 truncate">{currentStop.title}</p>
          <p className="mt-2 text-sm font-semibold leading-snug line-clamp-2">{currentStop.prompt.question}</p>
        </div>

        <div className="flex-1 min-h-0">
          {currentStop.prompt.kind === 'time_travel_photo' && (
            <TimeTravelCamera
              key={currentStop.id}
              immersive
              overlayImageUrl={currentStop.prompt.timeTravelImageUrl}
              caption={currentStop.prompt.timeTravelCaption}
              opacity={currentStop.prompt.timeTravelOpacity ?? 0.5}
              initialDataUrl={timeTravelPhotoDataUrl ?? undefined}
              onCapture={setTimeTravelPhotoDataUrl}
            />
          )}
          {currentStop.prompt.kind === 'drawing' && (
            <div className="h-full p-4">
              <DrawingPad
                key={currentStop.id}
                immersive
                subject={currentStop.prompt.drawingSubject}
                initialDataUrl={drawingDataUrl ?? undefined}
                onChange={(url) => setDrawingDataUrl(url)}
              />
            </div>
          )}
          {currentStop.prompt.kind === 'audio' && (
            <div className="h-full flex items-center justify-center p-5 bg-gradient-to-br from-black via-slate-950 to-pink-950">
              <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/10 backdrop-blur p-4">
                <AudioRecorder
                  key={currentStop.id}
                  maxSeconds={currentStop.prompt.audioMaxSeconds ?? 5}
                  subject={currentStop.prompt.audioSubject}
                  initialDataUrl={audioDataUrl ?? undefined}
                  onReady={(url, dur) => { setAudioDataUrl(url); setAudioDurationMs(dur); }}
                  onClear={() => { setAudioDataUrl(null); setAudioDurationMs(0); }}
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="shrink-0 grid grid-cols-[0.35fr_0.65fr] gap-3 p-4 bg-black/80 backdrop-blur border-t border-white/10"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
        >
          <button
            onClick={skipStop}
            disabled={skippingStop || submittingAnswer}
            className="h-12 rounded-2xl border border-white/20 bg-white/10 text-sm font-semibold tap-highlight flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {skippingStop ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />} {skippingStop ? 'Skipping…' : 'Skip'}
          </button>
          <button
            onClick={submitAnswer}
            disabled={submittingAnswer || skippingStop}
            className="h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-bold tap-highlight flex items-center justify-center gap-1.5 disabled:opacity-70"
          >
            {submittingAnswer ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submittingAnswer ? 'Saving…' : submitLabel}
            {!submittingAnswer && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  // ── Render: finished summary ────────────────────────────────────────────────

  if (isFinished) {
    const correct = attempt.results.filter(r => r.isCorrect && !r.skipped).length;
    const goToFinishedSlide = (index: number) => {
      setFinishedSlide(index);
      const carousel = finishedCarouselRef.current;
      if (!carousel) return;
      carousel.scrollTo({ left: carousel.clientWidth * index, behavior: 'smooth' });
    };

    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50 via-pink-50 to-purple-50 flex flex-col pb-tab-bar">
        {raceOverlay}
        <div
          className="shrink-0 px-4 pb-2 bg-background/75 backdrop-blur border-b border-white/50"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/hunts/${hunt.slug}`)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/70 border tap-highlight"
              aria-label="Back to hunt"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Finished hunt</p>
              <p className="text-sm font-black truncate">{hunt.title}</p>
            </div>
            <div className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black">
              {correct}/{totalStops}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {[0, 1].map(index => (
              <button
                key={index}
                onClick={() => goToFinishedSlide(index)}
                className={cn(
                  'h-1.5 rounded-full transition-all tap-highlight',
                  finishedSlide === index ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/25',
                )}
                aria-label={index === 0 ? 'Show postcard slide' : 'Show passport slide'}
                aria-pressed={finishedSlide === index}
              />
            ))}
          </div>
        </div>

        <div
          ref={finishedCarouselRef}
          onScroll={(event) => {
            const { scrollLeft, clientWidth } = event.currentTarget;
            if (clientWidth > 0) {
              setFinishedSlide(Math.min(1, Math.max(0, Math.round(scrollLeft / clientWidth))));
            }
          }}
          className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          <section className="w-full shrink-0 snap-start flex flex-col p-3 min-h-0">
            <div className="flex-1 min-h-0 rounded-[2rem] bg-white/70 border border-white shadow-xl overflow-hidden flex items-center justify-center">
              {postcardLoading && !postcardUrl ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="w-9 h-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-xs font-semibold">Painting your postcard…</p>
                </div>
              ) : postcardUrl ? (
                <img src={postcardUrl} alt="Hunt completion postcard" className="w-full h-full object-contain block bg-white" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  Postcard unavailable
                </div>
              )}
            </div>

            <div className="shrink-0 grid grid-cols-4 gap-2 pt-3">
              <button
                onClick={handleSharePostcard}
                disabled={sharing || postcardLoading || !postcardBlob}
                className="h-14 rounded-2xl bg-primary text-primary-foreground text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5 disabled:opacity-60"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>Share</span>
              </button>
              <button
                onClick={handleDownloadPostcard}
                disabled={!postcardBlob}
                className="h-14 rounded-2xl bg-white/80 border text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={() => navigate('/saved-trips')}
                className="h-14 rounded-2xl bg-white/80 border text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5"
              >
                <History className="w-4 h-4" />
                <span>Trips</span>
              </button>
              <button
                onClick={() => goToFinishedSlide(1)}
                className="h-14 rounded-2xl bg-white/80 border text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Stamps</span>
              </button>
            </div>
          </section>

          <section className="w-full shrink-0 snap-start flex flex-col p-4 min-h-0">
            <div className="shrink-0 flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Explorer Passport</p>
                <h2 className="text-xl font-black tracking-tight">Stamps earned</h2>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-white/80 border text-xs font-black text-emerald-700">
                {correct}/{totalStops}
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded-[2rem] bg-white/75 border border-white shadow-xl p-3 overflow-y-auto">
              <div className="grid grid-cols-4 gap-3">
                {hunt.stops.map((s, i) => {
                  const result = attempt.results.find(res => res.stopId === s.id);
                  const solved = !!result?.isCorrect && !result.skipped;
                  const skipped = !!result?.skipped;
                  const dateStr = result
                    ? new Date(result.answeredAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
                    : '—';
                  const rotations = [-3, 2, -4, 3, -1, 4, -2, 1];
                  const outerCls = solved ? 'border-emerald-500' : skipped ? 'border-muted-foreground/40' : 'border-amber-400';
                  const innerCls = solved ? 'bg-emerald-50 text-emerald-700' : skipped ? 'bg-muted/60 text-muted-foreground' : 'bg-amber-50 text-amber-700';

                  return (
                    <div
                      key={s.id}
                      className="min-w-0 flex flex-col items-center gap-1"
                      style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
                      title={s.title}
                    >
                      <div className={cn(
                        'w-[64px] h-[64px] rounded-full border-[3px] border-double flex flex-col items-center justify-center gap-0.5 shadow-sm',
                        outerCls, innerCls,
                      )}>
                        <span className="text-[22px] leading-none">{hunt.coverEmoji}</span>
                        <span className="text-[6px] font-bold uppercase tracking-tight text-center leading-tight px-1">#{i + 1}</span>
                        <span className="text-[5.5px] font-mono opacity-60 leading-none">{dateStr}</span>
                      </div>
                      <p className="w-full text-[8px] font-semibold text-center leading-tight truncate">{s.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 grid grid-cols-3 gap-2 pt-3">
              <button
                onClick={() => navigate('/passport')}
                className="h-14 rounded-2xl bg-primary text-primary-foreground text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5"
              >
                <BookOpen className="w-4 h-4" />
                <span>Passport</span>
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('Play this hunt again from the start?')) {
                    await huntsService.abandonAttempt(attempt.id);
                    navigate(`/hunts/${hunt.slug}/play`, { replace: true });
                    window.location.reload();
                  }
                }}
                className="h-14 rounded-2xl bg-white/80 border text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Again</span>
              </button>
              <button
                onClick={() => navigate('/hunts')}
                className="h-14 rounded-2xl bg-white/80 border text-[11px] font-bold tap-highlight flex flex-col items-center justify-center gap-0.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Hunts</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // ── Render: clue / prompt / reveal phases ───────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-tab-bar">
      {raceOverlay}
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

      {/* Stamp-dot progress row — one dot per stop */}
      <div className="bg-background/95 backdrop-blur border-b border-border/20 flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2">
        {hunt.stops.map((s, i) => {
          const isDone    = i < attempt.currentStopOrder;
          const isCurrent = i === attempt.currentStopOrder && !isFinished;
          const result    = isDone ? attempt.results.find(r => r.stopId === s.id) : null;
          const correct   = !!result?.isCorrect && !result.skipped;
          const skipped   = !!result?.skipped;
          return (
            <div
              key={s.id}
              title={s.title}
              className={cn(
                'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 select-none',
                isDone && correct  ? 'bg-emerald-500 text-white shadow-sm' :
                isDone && skipped  ? 'bg-muted text-muted-foreground' :
                isDone             ? 'bg-amber-400 text-white' :
                isCurrent          ? 'bg-primary text-primary-foreground ring-2 ring-primary/40' :
                                     'bg-muted/40 text-muted-foreground/40 border border-dashed border-border/50',
              )}
            >
              {isDone ? (skipped ? '·' : '✓') : i + 1}
            </div>
          );
        })}
        <span className="shrink-0 ml-auto pl-2 text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
          {attempt.currentStopOrder}/{totalStops}
        </span>
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* CLUE phase */}
        {phase === 'clue' && currentStop && (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-primary/5 to-pink-50 border p-5 space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{currentStop.order + 1}</div>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1 pt-2">Clue</span>
                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                  {hasLatvianCopy && (
                    <div className="flex items-center rounded-full border bg-background p-0.5">
                      {(['en', 'lv'] as const).map(lang => (
                        <button
                          key={lang}
                          onClick={() => {
                            window.speechSynthesis?.cancel();
                            setSpeaking(false);
                            setStopLanguage(lang);
                          }}
                          className={cn(
                            'h-7 px-2 rounded-full text-[11px] font-bold tap-highlight',
                            activeStopLanguage === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                          )}
                          aria-pressed={activeStopLanguage === lang}
                        >
                          {lang === 'lv' ? '🇱🇻 LV' : '🇺🇸 EN'}
                        </button>
                      ))}
                    </div>
                  )}
                  {currentStop.clueAudio && (
                    <button
                      onClick={() => {
                        if (audioGuideOpen) stopAudioGuide();
                        setAudioGuideOpen(open => !open);
                      }}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center tap-highlight border',
                        audioGuideOpen ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border',
                      )}
                      aria-label="Audio guide controls"
                      aria-pressed={audioGuideOpen}
                    >
                      <Headphones className="w-4 h-4" />
                    </button>
                  )}
                  {currentStop.parentHint && (
                    <button
                      onClick={() => setShowParentHint(open => !open)}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center tap-highlight border',
                        showParentHint ? 'bg-amber-500 text-white border-amber-500' : 'bg-background border-border text-amber-700',
                      )}
                      aria-label={showParentHint ? 'Hide grown-up hint' : 'Ask a grown-up'}
                      aria-pressed={showParentHint}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => speak(displayedClueText, activeStopLanguage)}
                    className={cn('w-9 h-9 rounded-full flex items-center justify-center tap-highlight border', speaking ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border')}
                    aria-label={speaking ? 'Stop reading' : 'Read clue aloud'}
                  >
                    {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-base leading-relaxed">{displayedClueText}</p>
              {promptActionCopy && (
                <div className="rounded-2xl border border-primary/20 bg-primary/8 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Your task</span>
                    <span className="min-w-0 flex-1 text-sm font-black text-foreground truncate">{promptActionCopy.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {currentStop.prompt.question}
                  </p>
                  <button
                    onClick={() => setPhase('prompt')}
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-black tap-highlight flex items-center justify-center gap-1.5"
                  >
                    {promptActionCopy.cta} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {currentStop.clueAudio && audioGuideOpen && (
                <div className="rounded-2xl bg-background/90 border border-border/70 p-3 space-y-2">
                  <audio
                    ref={audioGuideRef}
                    key={currentStop.clueAudio}
                    src={currentStop.clueAudio}
                    preload="metadata"
                    onLoadedMetadata={(event) => {
                      const duration = event.currentTarget.duration;
                      setAudioGuideDuration(Number.isFinite(duration) ? duration : 0);
                      event.currentTarget.volume = audioGuideVolume;
                    }}
                    onTimeUpdate={(event) => setAudioGuideProgress(event.currentTarget.currentTime || 0)}
                    onPlay={() => setAudioGuidePlaying(true)}
                    onPause={() => setAudioGuidePlaying(false)}
                    onEnded={() => setAudioGuidePlaying(false)}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAudioGuide}
                      className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap-highlight shrink-0"
                      aria-label={audioGuidePlaying ? 'Pause audio guide' : 'Play audio guide'}
                    >
                      {audioGuidePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button
                      onClick={stopAudioGuide}
                      className="w-10 h-10 rounded-full bg-muted text-foreground flex items-center justify-center tap-highlight shrink-0"
                      aria-label="Stop audio guide"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                        <span>{formatGuideTime(audioGuideProgress)}</span>
                        <span>{formatGuideTime(audioGuideDuration)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={audioGuideDuration || 0}
                        value={Math.min(audioGuideProgress, audioGuideDuration || audioGuideProgress)}
                        onChange={(event) => {
                          const nextTime = Number(event.target.value);
                          setAudioGuideProgress(nextTime);
                          if (audioGuideRef.current) audioGuideRef.current.currentTime = nextTime;
                        }}
                        className="w-full accent-primary"
                        aria-label="Audio guide position"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Volume2 className="w-4 h-4 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioGuideVolume}
                      onChange={(event) => {
                        const nextVolume = Number(event.target.value);
                        setAudioGuideVolume(nextVolume);
                        if (audioGuideRef.current) audioGuideRef.current.volume = nextVolume;
                      }}
                      className="w-full accent-primary"
                      aria-label="Audio guide volume"
                    />
                  </div>
                </div>
              )}
              <div className="rounded-2xl bg-background/85 border border-border/70 p-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1 min-w-0">
                    {currentStop.address || 'Find this stop'}
                  </span>
                  {distanceToCurrent != null && (
                    <span className={cn('shrink-0 text-[11px] font-bold rounded-full px-2 py-1', isAtStop ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                      {isAtStop ? 'Close' : `${Math.round(distanceToCurrent)}m`}
                    </span>
                  )}
                  <button
                    onClick={() => setShowLocationMenu(open => !open)}
                    className="h-9 px-3 rounded-full bg-foreground text-background text-xs font-black tap-highlight flex items-center gap-1.5 shrink-0"
                    aria-expanded={showLocationMenu}
                    aria-label="Open location actions"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Go</span>
                    <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', showLocationMenu && 'rotate-90')} />
                  </button>
                </div>
                {showLocationMenu && (
                  <div className={cn('grid gap-1.5 border-t border-border/60 pt-2', hasStopCoordinates ? 'grid-cols-4' : 'grid-cols-2')}>
                    {hasStopCoordinates && (
                      <button
                        onClick={handleLocate}
                        disabled={locating}
                        className="min-w-0 h-10 rounded-xl bg-muted text-foreground text-[10px] font-black tap-highlight flex flex-col items-center justify-center gap-0.5 disabled:opacity-70"
                        aria-label="Auto check in with GPS"
                      >
                        {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Locate className="w-3.5 h-3.5" />}
                        <span>{locating ? 'GPS…' : 'GPS'}</span>
                      </button>
                    )}
                    <button
                      onClick={openMapsNavigation}
                      className="min-w-0 h-10 rounded-xl bg-muted text-foreground text-[10px] font-black tap-highlight flex flex-col items-center justify-center gap-0.5"
                      aria-label="Open map navigation"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Maps</span>
                    </button>
                    <button
                      onClick={() => setPhase('prompt')}
                      className="min-w-0 h-10 rounded-xl bg-primary text-primary-foreground text-[10px] font-black tap-highlight flex flex-col items-center justify-center gap-0.5"
                      aria-label="Manual check in"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Here</span>
                    </button>
                    {hasStopCoordinates && (
                      <button
                        onClick={() => setShowARGuide(true)}
                        className="min-w-0 h-10 rounded-xl bg-black text-white text-[10px] font-black tap-highlight flex flex-col items-center justify-center gap-0.5"
                        aria-label="Open AR arrow guide"
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>AR</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Parent hint — co-pilot mode */}
              {currentStop.parentHint && showParentHint && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">🤝 Grown-up's hint</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{currentStop.parentHint}</p>
                  <button onClick={() => setShowParentHint(false)} className="text-[11px] font-medium text-amber-700 underline">Hide</button>
                </div>
              )}
            </div>
          </>
        )}

        {/* PROMPT phase */}
        {phase === 'prompt' && currentStop && (
          <div className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-primary">Task</p>
              <h2 className="text-xl font-black leading-tight">{promptActionCopy?.title ?? 'Action to do'}</h2>
              <p className="text-sm font-semibold leading-snug text-foreground/85">{currentStop.prompt.question}</p>
              <p className="text-xs text-muted-foreground">
                This is the task/question for this stop. Complete it, then the app reveals any extra story.
              </p>
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

            {/* Voice answer — speech-to-text matched against correctAnswers */}
            {currentStop.prompt.kind === 'voice_answer' && (
              <VoiceAnswerInput
                language={activeStopLanguage}
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

            {/* Spot photo — admin-supplied reference + optional capture */}
            {currentStop.prompt.kind === 'spot_photo' && (
              <div className="space-y-3">
                {/* Reference image — "Find this!" */}
                {currentStop.prompt.referenceImage ? (
                  <div className="rounded-2xl overflow-hidden border-2 border-amber-300 bg-amber-50/30 shadow-sm">
                    <div className="px-3 pt-2.5 pb-2 bg-amber-100/80 border-b border-amber-200 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-700 shrink-0" />
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-800 flex-1">Find this!</p>
                      <span className="text-[10px] text-amber-700/80 font-medium">Reference</span>
                    </div>
                    <img
                      src={currentStop.prompt.referenceImage}
                      alt="Find this thing"
                      className="w-full aspect-[4/3] object-cover"
                    />
                    {currentStop.prompt.photoSubject && (
                      <p className="px-3 py-2 text-xs text-muted-foreground border-t border-amber-200 bg-amber-50/40">
                        💡 {currentStop.prompt.photoSubject}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                    {currentStop.prompt.photoSubject ?? 'Find what the clue describes.'}
                  </div>
                )}

                {/* Optional photo capture */}
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
                    <img src={photoDataUrl} alt="Your photo" className="w-full aspect-[4/3] object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow">
                      Your photo ✓
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => setPhotoDataUrl(null)}
                      className="absolute bottom-2 left-2 px-3 py-1.5 rounded-full bg-background/90 text-xs font-medium shadow-md"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 tap-highlight"
                  >
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Take a photo (optional)</span>
                  </button>
                )}
                <p className="text-[11px] text-muted-foreground leading-snug px-1">
                  Photo is optional — tap "Found it!" below once you've spotted it. If you take one, we'll save it as a memory and check it later.
                </p>
              </div>
            )}

            {/* Audio — record a short sound clip */}
            {currentStop.prompt.kind === 'audio' && (
              <AudioRecorder
                maxSeconds={currentStop.prompt.audioMaxSeconds ?? 5}
                subject={currentStop.prompt.audioSubject}
                initialDataUrl={audioDataUrl ?? undefined}
                onReady={(url, dur) => { setAudioDataUrl(url); setAudioDurationMs(dur); }}
                onClear={() => { setAudioDataUrl(null); setAudioDurationMs(0); }}
              />
            )}

            {/* Drawing — in-app canvas */}
            {currentStop.prompt.kind === 'drawing' && (
              <DrawingPad
                subject={currentStop.prompt.drawingSubject}
                initialDataUrl={drawingDataUrl ?? undefined}
                onChange={(url) => setDrawingDataUrl(url)}
              />
            )}

            {/* Time-travel photo — historical image over live camera */}
            {currentStop.prompt.kind === 'time_travel_photo' && (
              <TimeTravelCamera
                overlayImageUrl={currentStop.prompt.timeTravelImageUrl}
                caption={currentStop.prompt.timeTravelCaption}
                opacity={currentStop.prompt.timeTravelOpacity ?? 0.5}
                initialDataUrl={timeTravelPhotoDataUrl ?? undefined}
                onCapture={setTimeTravelPhotoDataUrl}
              />
            )}

            {/* Observation — no input */}
            {currentStop.prompt.kind === 'observation' && (
              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                Just observe — no need to type anything. Tap "Done" when you've done it.
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={skipStop}
                disabled={skippingStop || submittingAnswer || verifyingPhoto}
                className="h-12 px-4 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center gap-1.5 disabled:opacity-60"
              >
                {skippingStop ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />} {skippingStop ? 'Skipping…' : 'Skip'}
              </button>
              <button onClick={submitAnswer} disabled={verifyingPhoto || submittingAnswer || skippingStop} className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center gap-1.5 disabled:opacity-60">
                {(verifyingPhoto || submittingAnswer) && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingPhoto
                  ? 'Checking photo…'
                  : submittingAnswer
                    ? 'Saving…'
                    : currentStop.prompt.kind === 'observation'
                      ? 'Done'
                      : currentStop.prompt.kind === 'spot_photo'
                        ? (photoDataUrl ? 'Found it! Save photo' : 'Found it!')
                        : 'Submit'}
                {!verifyingPhoto && !submittingAnswer && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* REVEAL phase */}
        {phase === 'reveal' && currentStop && (() => {
          const lastResult = attempt.results.find(r => r.stopId === currentStop.id);
          const wasSkipped = lastResult?.skipped;
          const wasCorrect = lastResult?.isCorrect && !wasSkipped;
          const stampDate  = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase();

          // Tier colours matching the Passport page
          const stampStyle = wasCorrect
            ? { outer: 'border-emerald-500', inner: 'bg-emerald-50 text-emerald-800', label: 'Solved! ✓',   bg: 'bg-emerald-50/60 border-emerald-200' }
            : wasSkipped
            ? { outer: 'border-muted-foreground/40', inner: 'bg-muted/60 text-muted-foreground', label: 'Skipped', bg: 'bg-muted/30 border-border' }
            : { outer: 'border-amber-500', inner: 'bg-amber-50 text-amber-800', label: 'Explored!',   bg: 'bg-amber-50/60 border-amber-200' };

          return (
            <div className="space-y-4">

              {/* ── Stop stamp ──────────────────────────────────────────── */}
              <div className={cn('rounded-2xl border p-4 flex items-center gap-4', stampStyle.bg)}>
                {/* Rubber stamp visual */}
                <div
                  className={cn(
                    'shrink-0 w-[72px] h-[72px] rounded-full border-[3px] border-double flex flex-col items-center justify-center gap-0.5 shadow-md',
                    stampStyle.outer, stampStyle.inner,
                  )}
                  style={{ transform: 'rotate(-4deg)' }}
                >
                  <span className="text-[28px] leading-none">{hunt.coverEmoji}</span>
                  <span className="text-[6.5px] font-bold uppercase tracking-tight text-center leading-tight px-1">
                    Stop {currentStop.order + 1}/{totalStops}
                  </span>
                  <span className="text-[6px] font-mono opacity-70 leading-none">{stampDate}</span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Stop stamp earned</p>
                  <p className="font-black text-base leading-tight truncate">{currentStop.title}</p>
                  <p className="text-sm font-semibold mt-0.5">{stampStyle.label}</p>
                  {!wasSkipped && lastResult?.answer
                    && !['✓', '(photo)', '(audio)', '(drawing)', '(time-travel-photo)'].includes(lastResult.answer) && (
                    <p className="text-xs text-muted-foreground mt-0.5">Your answer: {lastResult.answer}</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-sky-50 border border-sky-200 p-5 space-y-2">
                {displayedFunFact.trim() ? (
                  <>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-sky-700" />
                      <p className="text-xs font-black uppercase tracking-widest text-sky-800 flex-1">Fun fact revealed</p>
                      {hasLatvianCopy && (
                        <div className="flex items-center rounded-full border bg-background p-0.5">
                          {(['en', 'lv'] as const).map(lang => (
                            <button
                              key={lang}
                              onClick={() => {
                                window.speechSynthesis?.cancel();
                                setSpeaking(false);
                                setStopLanguage(lang);
                              }}
                              className={cn(
                                'h-7 px-2 rounded-full text-[11px] font-bold tap-highlight',
                                activeStopLanguage === lang ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                              )}
                              aria-pressed={activeStopLanguage === lang}
                            >
                              {lang === 'lv' ? '🇱🇻 LV' : '🇺🇸 EN'}
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => speak(displayedFunFact, activeStopLanguage)}
                        className={cn('w-8 h-8 rounded-full flex items-center justify-center tap-highlight', speaking ? 'bg-primary text-primary-foreground' : 'bg-background border border-border')}
                        aria-label={speaking ? 'Stop reading' : 'Read fact aloud'}
                      >
                        {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-base leading-relaxed">{displayedFunFact}</p>
                  </>
                ) : (
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-sky-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-sky-800">Stop complete</p>
                      <p className="text-sm text-sky-900/80 mt-1">No extra fun fact for this stop — your memory is saved.</p>
                    </div>
                  </div>
                )}
                {/* Photo verification feedback */}
                {lastResult?.photoDataUrl && lastResult.photoReviewStatus === 'pending' && (
                  <p className="text-[11px] text-amber-700 mt-2">📸 Photo saved — queued for a grown-up/admin check.</p>
                )}
                {lastResult?.photoDataUrl && lastResult.photoReviewStatus === 'rejected' && (
                  <p className="text-[11px] text-rose-700 mt-2">📸 Photo saved — needs a better match next time.</p>
                )}
                {lastResult?.photoDataUrl && lastResult.photoReviewStatus === 'approved' && (
                  <p className="text-[11px] text-emerald-700 mt-2">📸 Photo saved!</p>
                )}
                {lastResult?.photoDataUrl && lastResult.photoReviewNotes && (
                  <p className="text-[11px] text-muted-foreground mt-1">{lastResult.photoReviewNotes}</p>
                )}
                {lastResult?.answer === '(time-travel-photo)' && lastResult.photoDataUrl && (
                  <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border">
                    <History className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] text-muted-foreground flex-1">Time-travel photo saved</span>
                    <img src={lastResult.photoDataUrl} alt="Your time-travel match" className="w-14 h-14 rounded-lg object-cover border" />
                  </div>
                )}
                {/* Audio capture preview */}
                {lastResult?.audioDataUrl && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-background/80 border">
                    <Mic className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[11px] text-muted-foreground">
                      Sound saved · {((lastResult.audioDurationMs ?? 0) / 1000).toFixed(1)}s
                    </span>
                    <audio src={lastResult.audioDataUrl} controls className="ml-auto h-8" />
                  </div>
                )}
                {/* Drawing capture preview */}
                {lastResult?.drawingDataUrl && (
                  <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border">
                    <Pencil className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                    <span className="text-[11px] text-muted-foreground flex-1">Drawing saved</span>
                    <img src={lastResult.drawingDataUrl} alt="Your drawing" className="w-14 h-14 rounded-lg object-cover border" />
                  </div>
                )}
              </div>

              <button onClick={next} disabled={advancingStop} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold tap-highlight flex items-center justify-center gap-2 disabled:opacity-70">
                {advancingStop ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    {attempt.currentStopOrder + 1 >= totalStops ? 'Finish hunt' : 'Next stop'} <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })()}
      </div>

      {showARGuide && currentStop && hasStopCoordinates && (
        <ARClueOverlay
          target={{
            title: currentStop.title,
            lat: currentStop.lat as number,
            lon: currentStop.lon as number,
            address: currentStop.address,
          }}
          onClose={() => setShowARGuide(false)}
        />
      )}
    </div>
  );
}
