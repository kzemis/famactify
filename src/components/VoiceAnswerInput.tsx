// VoiceAnswerInput — speech-to-text answer entry for kids who can't yet type comfortably.
// Uses the Web Speech API (webkitSpeechRecognition / SpeechRecognition).
// Falls back to keyboard input on unsupported browsers (most desktop Firefox, etc).

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, RotateCcw, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  /** UI language for speech recognition (en-US / lv-LV) */
  language?: 'en' | 'lv';
  /** Called whenever the transcript changes (parent stores it as the answer) */
  onTranscript: (text: string) => void;
  /** Optional initial transcript (e.g. when re-entering the prompt phase) */
  initialTranscript?: string;
  /** Compact mode — smaller mic area for race overlays etc. */
  compact?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function VoiceAnswerInput({
  language = 'en',
  onTranscript,
  initialTranscript,
  compact = false,
}: Props) {
  const [transcript, setTranscript] = useState(initialTranscript ?? '');
  const [interim, setInterim]       = useState('');
  const [listening, setListening]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef(transcript);

  // Keep ref in sync so onresult handler reads latest value without re-binding
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  // Detect support — safe on SSR
  const SR = (typeof window !== 'undefined'
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
    : null);
  const supported = !!SR;

  // Build recognizer once language changes
  useEffect(() => {
    if (!supported) return;
    const r = new SR();
    r.lang = language === 'lv' ? 'lv-LV' : 'en-US';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 3;

    r.onresult = (event: any) => {
      let interimText = '';
      let finalText   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText) {
        const next = (transcriptRef.current + ' ' + finalText).trim();
        setTranscript(next);
        setInterim('');
        onTranscript(next);
      } else {
        setInterim(interimText);
      }
    };
    r.onerror = (e: any) => {
      console.warn('[VoiceAnswerInput] error', e);
      if (e.error === 'not-allowed') setError('Microphone permission denied — tap the lock icon in your browser to allow it.');
      else if (e.error === 'no-speech') setError("Didn't catch that — try again a bit louder.");
      else if (e.error === 'audio-capture') setError('No microphone found.');
      else if (e.error === 'aborted') setError(null); // user-initiated stop, not an error
      else setError(`Speech error: ${e.error}`);
      setListening(false);
    };
    r.onend = () => setListening(false);

    recognitionRef.current = r;
    return () => {
      try { r.stop(); } catch {}
      r.onresult = null;
      r.onerror  = null;
      r.onend    = null;
      recognitionRef.current = null;
    };
  }, [language, supported, SR, onTranscript]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setError(null);
    setInterim('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      console.warn('[VoiceAnswerInput] start error', e);
      setListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
    setListening(false);
  };

  const clearTranscript = () => {
    if (listening) stopListening();
    setTranscript('');
    setInterim('');
    setError(null);
    onTranscript('');
  };

  // ── Keyboard fallback ────────────────────────────────────────────────────
  if (!supported || keyboardMode) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={transcript}
          onChange={e => { setTranscript(e.target.value); onTranscript(e.target.value); }}
          autoFocus
          placeholder="Type your answer…"
          className="w-full h-12 rounded-2xl border border-border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
        />
        {supported ? (
          <button
            onClick={() => setKeyboardMode(false)}
            className="text-xs font-semibold text-primary tap-highlight flex items-center gap-1"
          >
            <Mic className="w-3 h-3" /> Use voice instead
          </button>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Voice input isn't supported in this browser — type your answer instead.
          </p>
        )}
      </div>
    );
  }

  // ── Voice mode ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Mic className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
          Say your answer
        </p>
        <button
          onClick={() => setKeyboardMode(true)}
          className="text-[10px] font-semibold text-muted-foreground tap-highlight flex items-center gap-1"
          aria-label="Switch to keyboard input"
        >
          <Keyboard className="w-3 h-3" /> Type instead
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Big mic button */}
        <button
          onClick={listening ? stopListening : startListening}
          className={cn(
            'w-full rounded-3xl flex flex-col items-center justify-center gap-2 transition-all tap-highlight active:scale-[0.98]',
            compact ? 'aspect-[3/1]' : 'aspect-[3/2]',
            listening
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
              : 'bg-primary/10 hover:bg-primary/20 text-primary',
          )}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
        >
          {/* Mic circle with pulsing rings while listening */}
          <div className="relative">
            {listening && (
              <>
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                <span className="absolute -inset-1 rounded-full bg-white/20 animate-ping" style={{ animationDelay: '0.3s' }} />
              </>
            )}
            <div className={cn(
              'relative w-16 h-16 rounded-full flex items-center justify-center',
              listening ? 'bg-white/25' : 'bg-primary/15',
            )}>
              {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </div>
          </div>
          <p className="text-base font-bold">
            {listening
              ? 'Listening… tap to stop'
              : transcript
                ? 'Tap to add more'
                : 'Tap to speak'}
          </p>
          {listening && <p className="text-[11px] text-white/85">Speak clearly toward your phone</p>}
          {!listening && !transcript && <p className="text-[11px] text-muted-foreground">We'll match what you say</p>}
        </button>

        {/* Transcript display */}
        {(transcript || interim) && (
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Heard:</p>
            <p className="text-base font-medium leading-snug">
              {transcript}
              {interim && (
                <span className="text-muted-foreground italic">
                  {transcript ? ' ' : ''}{interim}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Retry */}
        {transcript && !listening && (
          <button
            onClick={clearTranscript}
            className="text-xs text-muted-foreground tap-highlight flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Clear &amp; try again
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
            <p className="text-xs text-rose-700 leading-snug">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
