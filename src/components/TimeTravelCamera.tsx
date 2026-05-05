import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent, type ReactNode } from 'react';
import { Camera, Columns2, History, ImagePlus, Pencil, Redo2, RotateCcw, SlidersHorizontal, Sparkles, SwitchCamera, Trash2, Undo2, UserCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type CaptureLayout = 'inset' | 'split' | 'split_selfie';

type TimeTravelCameraProps = {
  overlayImageUrl?: string;
  caption?: string;
  opacity?: number;
  immersive?: boolean;
  overlayHeader?: ReactNode;
  overlayFooter?: ReactNode;
  initialDataUrl?: string;
  onCapture: (dataUrl: string | null) => void;
};

const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 960;
const SPLIT_GAP = 16;
const DRAW_COLORS = ['#ffffff', '#ec4899', '#f59e0b', '#22c55e', '#38bdf8', '#111827'];
const EMOJI_STAMPS = ['⭐', '❤️', '🌈', '🐾', '👀', '✨'];

function getSourceSize(source: HTMLVideoElement | HTMLImageElement) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.naturalWidth, height: source.naturalHeight };
}

function drawCoverInto(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  targetX: number,
  targetY: number,
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

  ctx.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, targetX, targetY, targetWidth, targetHeight);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
) {
  drawCoverInto(ctx, source, 0, 0, targetWidth, targetHeight);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawHistoricalInset(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  alpha: number,
) {
  const insetWidth = Math.round(targetWidth * 0.36);
  const insetHeight = Math.round(targetHeight * 0.28);
  const x = targetWidth - insetWidth - Math.round(targetWidth * 0.04);
  const y = Math.round(targetHeight * 0.055);

  ctx.save();
  roundedRectPath(ctx, x - 8, y - 8, insetWidth + 16, insetHeight + 16, 28);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  roundedRectPath(ctx, x, y, insetWidth, insetHeight, 20);
  ctx.clip();
  ctx.globalAlpha = alpha;
  drawCoverInto(ctx, source, x, y, insetWidth, insetHeight);
  ctx.restore();
}

function drawSideBySide(
  ctx: CanvasRenderingContext2D,
  cameraSource: HTMLVideoElement | HTMLImageElement,
  overlay: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  mirrorCamera: boolean,
) {
  const panelWidth = Math.floor((canvasWidth - SPLIT_GAP) / 2);

  // White background (visible as gap)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Left panel — camera / "NOW"
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, panelWidth, canvasHeight);
  ctx.clip();
  if (mirrorCamera) {
    ctx.translate(panelWidth, 0);
    ctx.scale(-1, 1);
  }
  drawCoverInto(ctx, cameraSource, 0, 0, panelWidth, canvasHeight);
  ctx.restore();

  // Right panel — overlay / "THEN"
  ctx.save();
  ctx.beginPath();
  ctx.rect(panelWidth + SPLIT_GAP, 0, panelWidth, canvasHeight);
  ctx.clip();
  drawCoverInto(ctx, overlay, panelWidth + SPLIT_GAP, 0, panelWidth, canvasHeight);
  ctx.restore();

  // Labels
  ctx.save();
  ctx.font = `bold ${Math.round(canvasHeight * 0.032)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  const labelY = canvasHeight - Math.round(canvasHeight * 0.035);
  ctx.fillText('NOW', panelWidth / 2, labelY);
  ctx.fillText('THEN', panelWidth + SPLIT_GAP + panelWidth / 2, labelY);
  ctx.restore();
}

function drawSelfieCircle(
  ctx: CanvasRenderingContext2D,
  selfie: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const radius = Math.round(canvasWidth * 0.085);
  const cx = canvasWidth / 2;
  const cy = Math.round(canvasHeight * 0.14);
  const border = 5;

  // White border + shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + border, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();

  // Clipped selfie
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  drawCoverInto(ctx, selfie, cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
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

function proxiedImageUrl(url: string): string | null {
  if (!/^https?:\/\//i.test(url)) return null;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return readBlobAsDataUrl(file);
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  return readBlobAsDataUrl(await response.blob());
}

function hasVideoFrame(video: HTMLVideoElement | null): video is HTMLVideoElement {
  return !!video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0;
}

function waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 2500): Promise<void> {
  if (hasVideoFrame(video)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Camera is not ready yet'));
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      video.removeEventListener('loadedmetadata', check);
      video.removeEventListener('canplay', check);
      video.removeEventListener('playing', check);
    };

    const check = () => {
      if (!hasVideoFrame(video)) {
        rafId = window.requestAnimationFrame(check);
        return;
      }
      cleanup();
      resolve();
    };

    video.addEventListener('loadedmetadata', check);
    video.addEventListener('canplay', check);
    video.addEventListener('playing', check);
    rafId = window.requestAnimationFrame(check);
  });
}

export default function TimeTravelCamera({
  overlayImageUrl,
  caption,
  opacity = 0.5,
  immersive = false,
  overlayHeader,
  overlayFooter,
  initialDataUrl,
  onCapture,
}: TimeTravelCameraProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const hasAnnotationsRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const strokeChangedRef = useRef(false);
  const cameraSessionRef = useRef(0);

  // Ref callback: whenever React replaces the <video> element (layout switch),
  // re-attach the existing MediaStream so the camera feed isn't lost.
  const videoRefCallback = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(initialDataUrl ?? null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [previewOpacity, setPreviewOpacity] = useState(() => Math.max(0.1, Math.min(0.85, opacity)));
  const [includeOverlayInCapture, setIncludeOverlayInCapture] = useState(false);
  const [showOpacityControls, setShowOpacityControls] = useState(false);
  const [drawToolsOpen, setDrawToolsOpen] = useState(false);
  const [drawColor, setDrawColor] = useState('#ec4899');
  const [brushSize, setBrushSize] = useState(7);
  const [drawMode, setDrawMode] = useState<'pen' | 'emoji'>('pen');
  const [emojiStamp, setEmojiStamp] = useState('⭐');
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [overlayDataUrl, setOverlayDataUrl] = useState<string | null>(null);
  const [captureLayout, setCaptureLayout] = useState<CaptureLayout>('inset');
  // For "Full Story" two-step capture: scene first, then selfie
  const [pendingSceneDataUrl, setPendingSceneDataUrl] = useState<string | null>(null);

  // Pre-fetch the overlay image as a data URL so canvas operations bypass CORS.
  useEffect(() => {
    if (!overlayImageUrl) {
      setOverlayDataUrl(null);
      return;
    }
    // If it's already a data URL, just use it directly.
    if (overlayImageUrl.startsWith('data:')) { setOverlayDataUrl(overlayImageUrl); return; }
    let cancelled = false;
    (async () => {
      setOverlayDataUrl(null);
      const fetchSources = [overlayImageUrl, proxiedImageUrl(overlayImageUrl)].filter(Boolean) as string[];
      for (const source of fetchSources) {
        try {
          const dataUrl = await fetchImageAsDataUrl(source);
          if (!cancelled) setOverlayDataUrl(dataUrl);
          return;
        } catch { /* try the next source */ }
      }

      const imageSources = [overlayImageUrl, proxiedImageUrl(overlayImageUrl)].filter(Boolean) as string[];
      try {
        for (const source of imageSources) {
          const img = await loadImage(source);
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d')!.drawImage(img, 0, 0);
          if (!cancelled) setOverlayDataUrl(c.toDataURL('image/jpeg', 0.9));
          return;
        }
      } catch {
        console.warn('[TimeTravelCamera] Could not pre-fetch overlay image for canvas embed');
      }
    })();
    return () => { cancelled = true; };
  }, [overlayImageUrl]);

  const markAnnotations = (value: boolean) => {
    hasAnnotationsRef.current = value;
    setHasAnnotations(value);
  };

  const setHistoryCursor = (index: number) => {
    historyIndexRef.current = index;
    setHistoryIndex(index);
  };

  const loadAnnotationSnapshot = (dataUrl: string) => {
    const canvas = annotationCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const image = new Image();
    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      markAnnotations(true);
    };
    image.src = dataUrl;
  };

  const pushAnnotationHistory = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(dataUrl);
    setHistoryCursor(historyRef.current.length - 1);
  };

  const stopCamera = useCallback(() => {
    cameraSessionRef.current += 1;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const syncAnnotationCanvas = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;

    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const nextWidth = Math.round(rect.width * dpr);
    const nextHeight = Math.round(rect.height * dpr);
    if (canvas.width === nextWidth && canvas.height === nextHeight) return;

    const previous = document.createElement('canvas');
    const hadContent = hasAnnotationsRef.current && canvas.width > 0 && canvas.height > 0;
    if (hadContent) {
      previous.width = canvas.width;
      previous.height = canvas.height;
      previous.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    canvas.width = nextWidth;
    canvas.height = nextHeight;

    if (hadContent) {
      canvas.getContext('2d')?.drawImage(previous, 0, 0, nextWidth, nextHeight);
    }
  }, []);

  const clearAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setHistoryCursor(-1);
    markAnnotations(false);
  }, []);

  const undoAnnotation = () => {
    if (historyIndexRef.current < 0) return;
    if (historyIndexRef.current === 0) {
      const canvas = annotationCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHistoryCursor(-1);
      markAnnotations(false);
      return;
    }
    const nextIndex = historyIndexRef.current - 1;
    setHistoryCursor(nextIndex);
    loadAnnotationSnapshot(historyRef.current[nextIndex]);
  };

  const redoAnnotation = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    setHistoryCursor(nextIndex);
    loadAnnotationSnapshot(historyRef.current[nextIndex]);
  };

  useEffect(() => {
    syncAnnotationCanvas();
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncAnnotationCanvas);
      return () => window.removeEventListener('resize', syncAnnotationCanvas);
    }
    const observer = new ResizeObserver(syncAnnotationCanvas);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [syncAnnotationCanvas]);

  const startCamera = useCallback(async (force = false, requestedFacing: 'environment' | 'user' = facingMode) => {
    if (!force && (capturedDataUrl || streamRef.current)) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not available in this browser');
      return;
    }

    const sessionId = cameraSessionRef.current + 1;
    cameraSessionRef.current = sessionId;
    setStarting(true);
    setCameraError(null);
    try {
      stopCamera();
      cameraSessionRef.current = sessionId;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: requestedFacing } },
        audio: false,
      });
      if (cameraSessionRef.current !== sessionId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          await waitForVideoFrame(videoRef.current).catch(() => {});
        } catch (playError: any) {
          if (cameraSessionRef.current !== sessionId || playError?.name === 'AbortError') return;
          throw playError;
        }
      }
      syncAnnotationCanvas();
    } catch (error: any) {
      if (cameraSessionRef.current === sessionId) {
        setCameraError(error?.message || 'Could not start camera');
      }
    } finally {
      if (cameraSessionRef.current === sessionId) {
        setStarting(false);
      }
    }
  }, [capturedDataUrl, facingMode, stopCamera, syncAnnotationCanvas]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const getOutputSize = () => {
    if (!immersive) return { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
    const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    return {
      width: Math.max(720, Math.round(rect.width * scale)),
      height: Math.max(960, Math.round(rect.height * scale)),
    };
  };

  const drawAnnotationsTo = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas || !hasAnnotationsRef.current) return;
    ctx.drawImage(canvas, 0, 0, width, height);
  };

  /** Try to load an image; returns null instead of throwing on CORS/network errors. */
  const tryLoadImage = async (url: string): Promise<HTMLImageElement | null> => {
    try { return await loadImage(url); }
    catch { console.warn('[TimeTravelCamera] Could not load image for canvas:', url.slice(0, 80)); return null; }
  };

  const loadOverlayForCanvas = async (): Promise<HTMLImageElement | null> => {
    const sources = [
      overlayDataUrl,
      overlayImageUrl,
      overlayImageUrl ? proxiedImageUrl(overlayImageUrl) : null,
    ].filter(Boolean) as string[];

    for (const source of Array.from(new Set(sources))) {
      const image = await tryLoadImage(source);
      if (image && image.naturalWidth > 0 && image.naturalHeight > 0) return image;
    }

    return null;
  };

  const renderCameraOnlyFrame = async () => {
    const video = videoRef.current;
    if (!video) throw new Error('Camera is not ready yet');
    await waitForVideoFrame(video);

    const { width, height } = getOutputSize();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');

    if (facingMode === 'user') {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      drawCover(ctx, video, canvas.width, canvas.height);
      ctx.restore();
    } else {
      drawCover(ctx, video, canvas.width, canvas.height);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const renderVideoFrame = async (layout: CaptureLayout = captureLayout, selfieUrl?: string | null) => {
    const video = videoRef.current;
    if (!video) {
      throw new Error('Camera is not ready yet');
    }
    await waitForVideoFrame(video);

    const mirrorCamera = facingMode === 'user';

    // ── Side-by-side layouts ──
    if (layout === 'split' || layout === 'split_selfie') {
      const { width, height } = getOutputSize();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not supported');

      const overlay = await loadOverlayForCanvas();
      if (overlay) {
        drawSideBySide(ctx, video, overlay, canvas.width, canvas.height, mirrorCamera);
      } else if (overlayImageUrl) {
        throw new Error('Historical image is still loading — try again');
      } else {
        if (mirrorCamera) {
          ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
          drawCover(ctx, video, canvas.width, canvas.height);
          ctx.restore();
        } else {
          drawCover(ctx, video, canvas.width, canvas.height);
        }
      }

      if (layout === 'split_selfie' && selfieUrl) {
        const selfieImg = await tryLoadImage(selfieUrl);
        if (selfieImg) drawSelfieCircle(ctx, selfieImg, canvas.width, canvas.height);
      }

      drawAnnotationsTo(ctx, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.9);
    }

    // ── Inset layout (default) ──
    const { width, height } = getOutputSize();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');

    if (mirrorCamera) {
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      drawCover(ctx, video, canvas.width, canvas.height);
      ctx.restore();
    } else {
      drawCover(ctx, video, canvas.width, canvas.height);
    }

    if (overlayImageUrl) {
      const overlay = await loadOverlayForCanvas();
      if (overlay) {
        ctx.save();
        if (includeOverlayInCapture) {
          ctx.globalAlpha = previewOpacity;
          drawCover(ctx, overlay, canvas.width, canvas.height);
        } else {
          ctx.globalAlpha = 1;
          drawHistoricalInset(ctx, overlay, canvas.width, canvas.height, previewOpacity);
        }
        ctx.restore();
      } else {
        throw new Error('Historical image is still loading — try again');
      }
    }

    drawAnnotationsTo(ctx, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  /** Render a side-by-side using an already-captured scene image instead of the live video. */
  const renderScenePlusSelfie = async (sceneUrl: string, selfieUrl: string) => {
    const { width, height } = getOutputSize();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');

    const scene = await tryLoadImage(sceneUrl);
    if (!scene) throw new Error('Could not load scene image');

    const overlay = await loadOverlayForCanvas();
    if (overlay) {
      drawSideBySide(ctx, scene, overlay, canvas.width, canvas.height, false);
    } else if (overlayImageUrl) {
      throw new Error('Historical image is still loading — try again');
    } else {
      drawCover(ctx, scene, canvas.width, canvas.height);
    }

    const selfie = await tryLoadImage(selfieUrl);
    if (!selfie || selfie.naturalWidth === 0 || selfie.naturalHeight === 0) {
      throw new Error('Selfie camera is not ready yet');
    }
    drawSelfieCircle(ctx, selfie, canvas.width, canvas.height);

    drawAnnotationsTo(ctx, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const composeUploadedImage = async (dataUrl: string) => {
    const image = await loadImage(dataUrl);
    const { width, height } = getOutputSize();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported');
    drawCover(ctx, image, canvas.width, canvas.height);
    drawAnnotationsTo(ctx, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const capture = async () => {
    setCapturing(true);
    try {
      // ── "Full Story" two-step capture ──
      if (captureLayout === 'split_selfie') {
        if (!pendingSceneDataUrl) {
          // Step 1: capture the scene, then switch to front camera for selfie
          const sceneData = await renderCameraOnlyFrame();
          setPendingSceneDataUrl(sceneData);
          setCapturing(false);
          // Switch to front camera for the selfie step
          if (facingMode !== 'user') {
            setFacingMode('user');
            stopCamera();
            setTimeout(() => startCamera(true, 'user'), 50);
          }
          return;
        }
        // Step 2: capture selfie, composite everything
        const selfieCanvas = document.createElement('canvas');
        const video = videoRef.current;
        if (!video) throw new Error('Selfie camera is not ready yet');
        await waitForVideoFrame(video);
        selfieCanvas.width = video.videoWidth;
        selfieCanvas.height = video.videoHeight;
        const sCtx = selfieCanvas.getContext('2d')!;
        sCtx.save();
        sCtx.translate(selfieCanvas.width, 0);
        sCtx.scale(-1, 1);
        sCtx.drawImage(video, 0, 0);
        sCtx.restore();
        const selfieDataUrl = selfieCanvas.toDataURL('image/jpeg', 0.9);
        const dataUrl = await renderScenePlusSelfie(pendingSceneDataUrl, selfieDataUrl);
        setCapturedDataUrl(dataUrl);
        onCapture(dataUrl);
        setPendingSceneDataUrl(null);
        clearAnnotations();
        setDrawToolsOpen(false);
        stopCamera();
        return;
      }

      // ── Single-step capture (inset or split) ──
      const dataUrl = await renderVideoFrame(captureLayout);
      setCapturedDataUrl(dataUrl);
      onCapture(dataUrl);
      clearAnnotations();
      setDrawToolsOpen(false);
      stopCamera();
    } catch (error: any) {
      toast.error(error?.message || 'Could not capture photo');
    } finally {
      setCapturing(false);
    }
  };

  const retake = () => {
    setCapturedDataUrl(null);
    setPendingSceneDataUrl(null);
    onCapture(null);
    clearAnnotations();
    // Return to back camera if we were in selfie step
    if (captureLayout === 'split_selfie' && facingMode === 'user') {
      setFacingMode('environment');
    }
    startCamera(true);
  };

  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    stopCamera();
    // Explicitly restart with the new facing — don't rely on effect chain timing
    setTimeout(() => startCamera(true, nextFacing), 50);
  };

  const handleFallbackPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rawDataUrl = await readFileAsDataUrl(file);
      const dataUrl = hasAnnotationsRef.current ? await composeUploadedImage(rawDataUrl) : rawDataUrl;
      setCapturedDataUrl(dataUrl);
      onCapture(dataUrl);
      clearAnnotations();
      setDrawToolsOpen(false);
      stopCamera();
    } catch {
      toast.error('Could not load selected photo');
    }
  };

  const getCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
      scale: canvas.width / rect.width,
    };
  };

  const stampEmoji = (point: { x: number; y: number; scale: number }) => {
    const canvas = annotationCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.font = `${Math.round(brushSize * 6 * point.scale)}px "Apple Color Emoji", "Segoe UI Emoji", system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emojiStamp, point.x, point.y);
    markAnnotations(true);
    pushAnnotationHistory();
  };

  const drawLine = (from: { x: number; y: number; scale: number }, to: { x: number; y: number; scale: number }) => {
    const ctx = annotationCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = brushSize * to.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    markAnnotations(true);
    strokeChangedRef.current = true;
  };

  const handleDrawStart = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawToolsOpen || capturedDataUrl) return;
    syncAnnotationCanvas();
    const point = getCanvasPoint(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (drawMode === 'emoji') {
      stampEmoji(point);
      return;
    }
    drawingRef.current = true;
    strokeChangedRef.current = true;
    lastPointRef.current = point;
    drawLine(point, point);
  };

  const handleDrawMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || drawMode !== 'pen') return;
    const point = getCanvasPoint(event);
    const lastPoint = lastPointRef.current;
    if (!point || !lastPoint) return;
    drawLine(lastPoint, point);
    lastPointRef.current = point;
  };

  const handleDrawEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    const shouldPush = drawingRef.current && strokeChangedRef.current;
    drawingRef.current = false;
    lastPointRef.current = null;
    strokeChangedRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (shouldPush) pushAnnotationHistory();
  };

  const isSplitPreview = (captureLayout === 'split' || captureLayout === 'split_selfie') && overlayImageUrl && !capturedDataUrl;
  const isSelfieStep = captureLayout === 'split_selfie' && !!pendingSceneDataUrl && !capturedDataUrl;

  const cameraFrame = (
    <div
      ref={frameRef}
      className={cn('relative bg-black overflow-hidden', immersive ? 'absolute inset-0' : '')}
    >
      {capturedDataUrl ? (
        <img
          src={capturedDataUrl}
          alt="Captured time-travel match"
          className={cn('w-full object-cover', immersive ? 'h-full' : 'aspect-[4/3]')}
        />
      ) : isSelfieStep ? (
        /* ── Selfie step: show captured scene + live selfie ── */
        <>
          <div className={cn('relative w-full', immersive ? 'h-full' : 'aspect-[4/3]')}>
            <img src={pendingSceneDataUrl!} alt="" className="w-full h-full object-cover" />
            {/* Live selfie preview circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-4 border-white shadow-2xl overflow-hidden">
              <video
                ref={videoRefCallback}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="text-xs font-bold bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur">
                🤳 Now take a selfie!
              </span>
            </div>
          </div>
        </>
      ) : isSplitPreview ? (
        /* ── Split preview: video left, overlay right ── */
        <>
          <div className={cn('relative flex w-full', immersive ? 'h-full' : 'aspect-[4/3]')}>
            <div className="w-1/2 h-full relative overflow-hidden">
              <video
                ref={videoRefCallback}
                playsInline
                muted
                className={cn('w-full h-full object-cover', facingMode === 'user' && 'scale-x-[-1]', cameraError && 'hidden')}
              />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur">NOW</span>
            </div>
            <div className="w-[2px] bg-white shrink-0" />
            <div className="w-1/2 h-full relative overflow-hidden">
              <img src={overlayImageUrl} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur">THEN</span>
            </div>
          </div>
          {(starting || cameraError) && (
            <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-5 text-white bg-black/70')}>
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
      ) : (
        /* ── Inset (default) preview ── */
        <>
          <video
            ref={videoRefCallback}
            playsInline
            muted
            className={cn('w-full object-cover', immersive ? 'h-full' : 'aspect-[4/3]', facingMode === 'user' && 'scale-x-[-1]', cameraError && 'hidden')}
          />
          {overlayImageUrl && !cameraError && facingMode === 'environment' && (
            <img
              src={overlayImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{ opacity: previewOpacity }}
            />
          )}
          {overlayImageUrl && !cameraError && facingMode === 'user' && (
            <div className="absolute right-4 top-[calc(env(safe-area-inset-top)+86px)] w-32 h-44 rounded-3xl border-2 border-white/85 bg-white/15 shadow-2xl overflow-hidden pointer-events-none">
              <img
                src={overlayImageUrl}
                alt=""
                className="w-full h-full object-cover"
                style={{ opacity: previewOpacity }}
              />
            </div>
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

      <canvas
        ref={annotationCanvasRef}
        className={cn(
          'absolute inset-0 w-full h-full touch-none',
          drawToolsOpen && !capturedDataUrl ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none',
        )}
        onPointerDown={handleDrawStart}
        onPointerMove={handleDrawMove}
        onPointerUp={handleDrawEnd}
        onPointerCancel={handleDrawEnd}
        onPointerLeave={handleDrawEnd}
      />
    </div>
  );

  const doodleToolbar = drawToolsOpen && !capturedDataUrl && (
    <div className={cn('rounded-2xl border p-2 space-y-2', immersive ? 'border-white/15 bg-black/45 backdrop-blur text-white' : 'border-border bg-card')}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <button
          onClick={undoAnnotation}
          disabled={historyIndex < 0}
          className="w-8 h-8 rounded-full bg-white/10 disabled:opacity-35 flex items-center justify-center shrink-0"
          aria-label="Undo doodle"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redoAnnotation}
          disabled={historyIndex >= historyRef.current.length - 1}
          className="w-8 h-8 rounded-full bg-white/10 disabled:opacity-35 flex items-center justify-center shrink-0"
          aria-label="Redo doodle"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          onClick={clearAnnotations}
          disabled={!hasAnnotations}
          className="w-8 h-8 rounded-full bg-white/10 disabled:opacity-35 flex items-center justify-center shrink-0"
          aria-label="Clear doodles"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {DRAW_COLORS.map(color => (
          <button
            key={color}
            onClick={() => { setDrawColor(color); setDrawMode('pen'); }}
            className={cn('w-8 h-8 rounded-full border-2 shrink-0', drawMode === 'pen' && drawColor === color ? 'border-primary scale-110' : 'border-white/70')}
            style={{ background: color }}
            aria-label={`Draw ${color}`}
          />
        ))}
        {[4, 7, 12].map(size => (
          <button
            key={size}
            onClick={() => { setBrushSize(size); setDrawMode('pen'); }}
            className={cn('h-8 px-3 rounded-full text-xs font-bold shrink-0', brushSize === size && drawMode === 'pen' ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white')}
          >
            {size === 4 ? 'Thin' : size === 7 ? 'Bold' : 'Big'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {EMOJI_STAMPS.map(emoji => (
          <button
            key={emoji}
            onClick={() => { setEmojiStamp(emoji); setDrawMode('emoji'); }}
            className={cn('w-10 h-10 rounded-2xl text-lg shrink-0', drawMode === 'emoji' && emojiStamp === emoji ? 'bg-primary text-primary-foreground' : 'bg-white/10')}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  const modePicker = overlayImageUrl && !capturedDataUrl && !isSelfieStep && (
    <div className={cn('flex items-center justify-center gap-1 rounded-full border p-1', immersive ? 'border-white/15 bg-black/45 backdrop-blur' : 'border-border bg-card')}>
      {([
        { value: 'inset' as const, label: 'Portrait', Icon: Camera },
        { value: 'split' as const, label: 'Then & Now', Icon: Columns2 },
        { value: 'split_selfie' as const, label: 'Full Story', Icon: UserCircle2 },
      ]).map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => { setCaptureLayout(value); setPendingSceneDataUrl(null); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors tap-highlight',
            captureLayout === value
              ? 'bg-primary text-primary-foreground'
              : immersive ? 'text-white/80 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );

  const controlsContent = (
    <>
      {modePicker}

      {/* Opacity slider — only for inset mode */}
      {captureLayout === 'inset' && overlayImageUrl && !capturedDataUrl && showOpacityControls && (
        <div className={cn('rounded-full border px-3 py-2 flex items-center gap-2', immersive ? 'border-white/15 bg-black/45 backdrop-blur text-white' : 'border-border bg-card')}>
          <SlidersHorizontal className="w-4 h-4 text-white/80 shrink-0" />
          <input
            type="range"
            min={10}
            max={85}
            step={5}
            value={Math.round(previewOpacity * 100)}
            onChange={e => setPreviewOpacity(Number(e.target.value) / 100)}
            className="min-w-0 flex-1 accent-primary"
          />
          <button
            onClick={() => setIncludeOverlayInCapture(v => !v)}
            className={cn('w-9 h-9 rounded-full flex items-center justify-center tap-highlight shrink-0', includeOverlayInCapture ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white')}
            aria-label="Include old image in saved photo"
            title="Include old image in saved photo"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      )}

      {doodleToolbar}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackPick}
        className="hidden"
      />

      <div className="flex items-center justify-center gap-2">
        {capturedDataUrl ? (
          <button
            onClick={retake}
            className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
            aria-label="Retake photo"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        ) : (
          <>
            <button
              onClick={capture}
              disabled={capturing || starting || !!cameraError}
              className={cn(
                'w-12 h-12 rounded-full tap-highlight disabled:opacity-60 flex items-center justify-center',
                isSelfieStep ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground',
              )}
              aria-label={isSelfieStep ? 'Take selfie' : 'Capture photo'}
            >
              <Camera className={cn('w-5 h-5', capturing && 'animate-pulse')} />
            </button>
            {!isSelfieStep && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
                  aria-label="Upload photo"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setDrawToolsOpen(v => !v);
                    setShowOpacityControls(false);
                    syncAnnotationCanvas();
                  }}
                  className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', drawToolsOpen ? 'border-primary bg-primary text-primary-foreground' : immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
                  aria-label="Open drawing tools"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                {captureLayout === 'inset' && (
                  <button
                    onClick={() => {
                      setShowOpacityControls(v => !v);
                      setDrawToolsOpen(false);
                    }}
                    className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', showOpacityControls ? 'border-primary bg-primary text-primary-foreground' : immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
                    aria-label="Adjust old image opacity"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={switchCamera}
                  className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', facingMode === 'user' ? 'border-primary bg-primary text-primary-foreground' : immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
                  aria-label="Switch camera"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              </>
            )}
            {isSelfieStep && (
              <button
                onClick={retake}
                className={cn('w-12 h-12 rounded-full border tap-highlight flex items-center justify-center', immersive ? 'border-white/20 bg-black/45 text-white backdrop-blur' : 'border-border')}
                aria-label="Start over"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </>
  );

  if (immersive) {
    return (
      <div className="relative h-full overflow-hidden bg-black text-white">
        {cameraFrame}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/85 pointer-events-none" />

        {overlayHeader && (
          <div className="absolute left-4 right-4 z-20" style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}>
            {overlayHeader}
          </div>
        )}

        <div
          className="absolute left-4 right-4 z-20 space-y-3 max-h-[52dvh] overflow-y-auto no-scrollbar"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 14px)' }}
        >
          {controlsContent}
          {overlayFooter}
        </div>
      </div>
    );
  }

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

        {cameraFrame}

        {caption && (
          <p className="px-4 py-3 text-[11px] leading-snug text-muted-foreground border-t">{caption}</p>
        )}
      </div>

      <div className="space-y-3">{controlsContent}</div>
    </div>
  );
}
