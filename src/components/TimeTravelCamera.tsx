import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, History, ImagePlus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type TimeTravelCameraProps = {
  overlayImageUrl?: string;
  caption?: string;
  opacity?: number;
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
      ctx.globalAlpha = Math.max(0.1, Math.min(0.85, opacity));
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
        dataUrl = await renderVideoFrame(true);
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

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-start gap-3">
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

        <div className="relative bg-black">
          {capturedDataUrl ? (
            <img src={capturedDataUrl} alt="Captured time-travel match" className="w-full aspect-[4/3] object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn('w-full aspect-[4/3] object-cover', cameraError && 'hidden')}
              />
              {overlayImageUrl && !cameraError && (
                <img
                  src={overlayImageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ opacity: Math.max(0.1, Math.min(0.85, opacity)) }}
                />
              )}
              {(starting || cameraError) && (
                <div className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-3 text-center px-5 text-white">
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

        {caption && (
          <p className="px-4 py-3 text-[11px] leading-snug text-muted-foreground border-t">{caption}</p>
        )}
      </div>

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
            className="col-span-2 h-11 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center justify-center gap-2"
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
              className="h-11 rounded-2xl border border-border text-sm font-medium tap-highlight flex items-center justify-center gap-2"
            >
              <ImagePlus className="w-4 h-4" /> Upload
            </button>
          </>
        )}
      </div>

      {overlayImageUrl ? (
        <p className="text-[11px] text-muted-foreground px-1">
          Tip: slide your body until doorways, windows, trees, or skyline edges line up with the transparent image.
        </p>
      ) : (
        <p className="text-[11px] text-amber-700 px-1">
          Add a source-backed historical image URL in the hunt builder for the live overlay.
        </p>
      )}
    </div>
  );
}
