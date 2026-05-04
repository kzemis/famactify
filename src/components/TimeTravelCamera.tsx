import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, History, ImagePlus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TimeTravelCameraProps = {
  overlayImageUrl?: string;
  caption?: string;
  opacity?: number;
  immersive?: boolean;
  initialDataUrl?: string;
  onCapture: (dataUrl: string | null) => void;
};

const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 960;

function getSourceSize(source: HTMLVideoElement | HTMLImageElement) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
) {
  const { width, height } = getSourceSize(source);
  if (!width || !height) throw new Error('Source image is not ready');

  const scale = Math.max(targetWidth / width, targetHeight / height);
  const sourceWidth = targetWidth / scale;
  const sourceHeight = targetHeight / scale;
  const sourceX = (width - sourceWidth) / 2;
  const sourceY = (height - sourceHeight) / 2;

  ctx.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TimeTravelCamera({
  overlayImageUrl,
  caption,
  opacity = 0.5,
  immersive = false,
  initialDataUrl,
  onCapture,
}: TimeTravelCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(initialDataUrl ?? null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [previewOpacity, setPreviewOpacity] = useState(() => Math.max(0.1, Math.min(0.85, opacity)));
  const [includeOverlayInCapture, setIncludeOverlayInCapture] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (force = false) => {
    if (!force && (capturedDataUrl || streamRef.current)) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not available in this browser');
      return;
    }

    setStarting(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error: any) {
      setCameraError(error?.message || 'Could not start camera');
    } finally {
      setStarting(false);
    }
  }, [capturedDataUrl]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const renderVideoFrame = async (includeOverlay: boolean) => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      throw new Error('Camera is not ready yet');
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');

    drawCover(ctx, video, canvas.width, canvas.height);

    if (includeOverlay && overlayImageUrl) {
      const overlay = await loadImage(overlayImageUrl);
      ctx.save();
      ctx.globalAlpha = previewOpacity;
      drawCover(ctx, overlay, canvas.width, canvas.height);
      ctx.restore();
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const capture = async () => {
    setCapturing(true);
    try {
      let dataUrl: string;
      try {
        dataUrl = await renderVideoFrame(includeOverlayInCapture);
      } catch (error) {
        if (!overlayImageUrl) throw error;
        dataUrl = await renderVideoFrame(false);
        toast.warning('Saved camera photo without overlay — historical image could not be embedded');
      }
      setCapturedDataUrl(dataUrl);
      onCapture(dataUrl);
      stopCamera();
    } catch (error: any) {
      toast.error(error?.message || 'Could not capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const retake = () => {
    setCapturedDataUrl(null);
    onCapture(null);
    startCamera(true);
  };

  const handleFallbackPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCapturedDataUrl(dataUrl);
      onCapture(dataUrl);
      stopCamera();
    } catch {
      toast.error('Could not load selected photo');
    }
  };

  const cameraFrame = (
    <div className={cn('relative bg-black overflow-hidden', immersive ? 'flex-1 min-h-0' : '')}>
      {capturedDataUrl ? (
        <img
          src={capturedDataUrl}
          alt="Captured time-travel match"
          className={cn('w-full object-cover', immersive ? 'h-full' : 'aspect-[4/3]')}
        />
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            className={cn('w-full object-cover', immersive ? 'h-full' : 'aspect-[4/3]', cameraError && 'hidden')}
          />
          {overlayImageUrl && !cameraError && (
            <img
              src={overlayImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ opacity: previewOpacity }}
            />
          )}
          {(starting || cameraError) && (
            <div className={cn('w-full flex flex-col items-center justify-center gap-3 text-center px-5 text-white', immersive ? 'h-full' : 'aspect-[4/3]')}>
              {starting ? (
                <>
                  <div className="w-8 h-8 rounded-full border-2 border-white/80 border-t-transparent animate-spin" />
                  <p className="text-sm font-medium">Starting camera…</p>
                </>
              ) : (
                <>
                  <Camera className="w-9 h-9 text-white/70" />
                  <p className="text-sm font-semibold">Camera unavailable</p>
                  <p className="text-xs text-white/70">{cameraError}</p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const controls = (
    <div className={cn('space-y-3', immersive ? 'bg-black/80 backdrop-blur p-4 text-white' : '')}>
      {overlayImageUrl && !capturedDataUrl && (
        <div className={cn('rounded-2xl border p-3 space-y-2', immersive ? 'border-white/15 bg-white/10' : 'border-border bg-card')}>
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold uppercase tracking-widest">Old image opacity</label>
            <span className={cn('text-xs font-semibold tabular-nums', immersive ? 'text-white/75' : 'text-muted-foreground')}>{Math.round(previewOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={85}
            step={5}
            value={Math.round(previewOpacity * 100)}
            onChange={e => setPreviewOpacity(Number(e.target.value) / 100)}
            className="w-full accent-primary"
          />
          <button
            onClick={() => setIncludeOverlayInCapture(v => !v)}
            className={cn('w-full h-9 rounded-xl text-xs font-semibold tap-highlight', includeOverlayInCapture ? 'bg-primary text-primary-foreground' : immersive ? 'bg-white/10 text-white' : 'bg-muted text-foreground')}
          >
            {includeOverlayInCapture ? 'Saved photo will include old image' : 'Saved photo will be clean modern view'}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackPick}
        className="hidden"
      />

      <div className="grid grid-cols-2 gap-2">
        {capturedDataUrl ? (
          <button
            onClick={retake}
            className={cn('col-span-2 h-11 rounded-2xl border text-sm font-medium tap-highlight flex items-center justify-center gap-2', immersive ? 'border-white/20 bg-white/10 text-white' : 'border-border')}
          >
            <RotateCcw className="w-4 h-4" /> Retake alignment
          </button>
        ) : (
          <>
            <button
              onClick={capture}
              disabled={capturing || starting || !!cameraError}
              className="h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> {capturing ? 'Saving…' : 'Capture'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn('h-11 rounded-2xl border text-sm font-medium tap-highlight flex items-center justify-center gap-2', immersive ? 'border-white/20 bg-white/10 text-white' : 'border-border')}
            >
              <ImagePlus className="w-4 h-4" /> Upload
            </button>
          </>
        )}
      </div>

      <p className={cn('text-[11px] px-1 leading-snug', immersive ? 'text-white/70' : overlayImageUrl ? 'text-muted-foreground' : 'text-amber-700')}>
        {overlayImageUrl
          ? includeOverlayInCapture
            ? 'Tip: this will save the old and new views together. Turn this off to save only today’s clean photo.'
            : 'Tip: use the old image only as a guide. The saved photo is today’s clean view unless you include the overlay.'
          : 'Add a source-backed historical image URL in the hunt builder for the live overlay.'}
      </p>
    </div>
  );

  return (
    <div className={cn(immersive ? 'h-full flex flex-col' : 'space-y-3')}>
      <div className={cn('rounded-2xl border bg-card overflow-hidden', immersive && 'flex-1 min-h-0 flex flex-col rounded-none border-0 bg-black')}>
        <div className={cn('px-4 py-3 border-b flex items-start gap-3', immersive && 'hidden')}>
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold">Time-travel view</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Line up the old image over today’s view, then capture the match.
            </p>
          </div>
        </div>

        {cameraFrame}

        {caption && !immersive && (
          <p className="px-4 py-3 text-[11px] leading-snug text-muted-foreground border-t">{caption}</p>
        )}
      </div>

      {controls}
    </div>
  );
}
