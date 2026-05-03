import { useEffect, useRef, useState } from 'react';
import { Eraser, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawingPadProps {
  /** Optional context — what to draw (informative). */
  subject?: string;
  /** Called whenever the user finishes a stroke; `null` if the pad is empty. */
  onChange: (pngDataUrl: string | null) => void;
  /** Restore an in-progress drawing. */
  initialDataUrl?: string;
  /** CSS aspect ratio for the canvas — defaults to 4/3. */
  aspect?: string;
}

const COLORS = ['#111827', '#ec4899', '#2563eb', '#10b981', '#f59e0b'];
const STROKE_WIDTH = 4;
const ERASER_WIDTH = 18;

/**
 * DrawingPad — small touch-friendly canvas for kids.
 * Pointer events handle both touch and mouse. Each stroke is committed to the
 * canvas; an in-memory history of dataURLs powers undo. Output is exported as
 * a PNG data URL (typically 80–250KB depending on complexity).
 */
export default function DrawingPad({ subject, onChange, initialDataUrl, aspect = '4 / 3' }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<string[]>([]);
  const [color, setColor] = useState(COLORS[1]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [hasContent, setHasContent] = useState(!!initialDataUrl);

  // Initialize canvas backing store at full device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // White background so the export looks clean against any UI bg
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialDataUrl;
    }
    historyRef.current = [canvas.toDataURL('image/png')];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    lastPoint.current = getPoint(e);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? ERASER_WIDTH : STROKE_WIDTH;
    ctx.beginPath();
    ctx.arc(lastPoint.current.x, lastPoint.current.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !lastPoint.current) return;
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPoint.current = p;
  };

  const commit = () => {
    drawing.current = false;
    lastPoint.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    historyRef.current.push(url);
    if (historyRef.current.length > 24) historyRef.current.shift();
    setHasContent(true);
    onChange(url);
  };

  const onPointerUp = () => commit();

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (historyRef.current.length <= 1) {
      // back to blank
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      historyRef.current = [canvas.toDataURL('image/png')];
      setHasContent(false);
      onChange(null);
      return;
    }
    historyRef.current.pop(); // discard latest
    const prev = historyRef.current[historyRef.current.length - 1];
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      const blank = historyRef.current.length === 1;
      setHasContent(!blank);
      onChange(blank ? null : prev);
    };
    img.src = prev;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    historyRef.current = [canvas.toDataURL('image/png')];
    setHasContent(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {subject && (
        <p className="text-xs text-muted-foreground text-center px-4">{subject}</p>
      )}
      <div
        className="relative rounded-2xl overflow-hidden border bg-white shadow-sm"
        style={{ aspectRatio: aspect }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      {/* Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Colors */}
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool('pen'); }}
            aria-label={`Color ${c}`}
            className={cn(
              'w-8 h-8 rounded-full transition-transform',
              tool === 'pen' && color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : '',
            )}
            style={{ background: c }}
          />
        ))}
        <span className="w-px h-6 bg-border mx-1" />
        <button
          onClick={() => setTool('eraser')}
          className={cn(
            'h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1 tap-highlight',
            tool === 'eraser' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background',
          )}
        >
          <Eraser className="w-3.5 h-3.5" /> Eraser
        </button>
        <button
          onClick={undo}
          className="h-8 px-3 rounded-full border border-border text-xs font-medium flex items-center gap-1 bg-background tap-highlight"
        >
          <Undo2 className="w-3.5 h-3.5" /> Undo
        </button>
        <button
          onClick={clear}
          disabled={!hasContent}
          className="h-8 px-3 rounded-full border border-border text-xs font-medium flex items-center gap-1 bg-background tap-highlight disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>
    </div>
  );
}
