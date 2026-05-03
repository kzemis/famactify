import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AudioRecorderProps {
  /** Max recording length in seconds (default 5). Clamped 2..15. */
  maxSeconds?: number;
  /** Optional context — what to listen for. */
  subject?: string;
  /** Called when the user has a recording ready (data URL + duration in ms). */
  onReady: (dataUrl: string, durationMs: number) => void;
  /** Called when the user clears the recording. */
  onClear: () => void;
  /** If a recording is already present, render in playback mode. */
  initialDataUrl?: string;
}

/**
 * AudioRecorder — minimal touch-friendly mic button + playback.
 *
 * Records to whatever the platform supports (typically audio/webm on Chrome,
 * audio/mp4 on Safari). Auto-stops at maxSeconds. The result is exposed as a
 * base64 data URL so it can travel inside the existing JSONB attempt results.
 */
export default function AudioRecorder({ maxSeconds = 5, subject, onReady, onClear, initialDataUrl }: AudioRecorderProps) {
  const clamped = Math.max(2, Math.min(15, maxSeconds));
  const [phase, setPhase] = useState<'idle' | 'recording' | 'ready'>(initialDataUrl ? 'ready' : 'idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dataUrl, setDataUrl] = useState<string | null>(initialDataUrl ?? null);
  const [playing, setPlaying] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { recorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Mic recording not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          const duration = Date.now() - startedAtRef.current;
          setDataUrl(url);
          setElapsedMs(duration);
          setPhase('ready');
          onReady(url, duration);
        };
        reader.readAsDataURL(blob);
        // release mic
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setPhase('recording');
      // tick UI
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 100);
      // auto-stop
      stopTimerRef.current = window.setTimeout(() => stopRecording(), clamped * 1000);
    } catch (err: any) {
      toast.error(err?.message || 'Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (stopTimerRef.current) { window.clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
  };

  const togglePlay = () => {
    if (!dataUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(dataUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const reset = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setDataUrl(null);
    setElapsedMs(0);
    setPlaying(false);
    setPhase('idle');
    onClear();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const elapsedSec = (elapsedMs / 1000).toFixed(1);
  const fillPct = Math.min(100, (elapsedMs / (clamped * 1000)) * 100);

  if (phase === 'idle') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-5 flex flex-col items-center gap-3">
        <button
          onClick={startRecording}
          className="w-20 h-20 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center tap-highlight active:scale-95 transition-transform"
          aria-label="Start recording"
        >
          <Mic className="w-8 h-8" />
        </button>
        <p className="text-sm font-medium">Tap to record</p>
        {subject && <p className="text-xs text-muted-foreground text-center px-4">{subject}</p>}
        <p className="text-[11px] text-muted-foreground">Up to {clamped} seconds</p>
      </div>
    );
  }

  if (phase === 'recording') {
    return (
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 flex flex-col items-center gap-3">
        <button
          onClick={stopRecording}
          className="w-20 h-20 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center tap-highlight active:scale-95 transition-transform animate-pulse"
          aria-label="Stop recording"
        >
          <Square className="w-7 h-7 fill-current" />
        </button>
        <p className="text-sm font-semibold text-rose-700">Recording… {elapsedSec}s</p>
        <div className="w-full h-2 rounded-full bg-rose-200 overflow-hidden">
          <div className="h-full bg-rose-500 transition-all" style={{ width: `${fillPct}%` }} />
        </div>
        <p className="text-[11px] text-rose-700/80">Tap the square to stop, or wait for {clamped}s</p>
      </div>
    );
  }

  // ready
  return (
    <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center tap-highlight active:scale-95 transition-transform"
        aria-label={playing ? 'Pause playback' : 'Play recording'}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Sound captured</p>
        <p className="text-[11px] text-muted-foreground">{(elapsedMs / 1000).toFixed(1)}s · tap to preview</p>
      </div>
      <button
        onClick={reset}
        className={cn('w-10 h-10 rounded-full border border-border flex items-center justify-center tap-highlight')}
        aria-label="Re-record"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
