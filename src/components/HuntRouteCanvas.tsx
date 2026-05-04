import { useEffect, useRef } from 'react';
import type { ScavengerHunt, HuntStop } from '@/types/hunt';

interface HuntRouteCanvasProps {
  hunt: ScavengerHunt;
  className?: string;
}

const PROMPT_ICONS: Record<string, string> = {
  text: '❓',
  multiple_choice: '❓',
  photo: '📷',
  observation: '👀',
  audio: '🎧',
  drawing: '✏️',
  time_travel_photo: '🕰️',
};

function hasUsableCoords(stop: HuntStop): boolean {
  return Number.isFinite(stop.lat)
    && Number.isFinite(stop.lon)
    && !(Math.abs(stop.lat) < 0.0001 && Math.abs(stop.lon) < 0.0001);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 3 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trim()}…`;
}

function drawRouteMap(ctx: CanvasRenderingContext2D, hunt: ScavengerHunt, width: number, height: number) {
  const stops = [...hunt.stops].sort((a, b) => a.order - b.order).filter(hasUsableCoords);

  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#fff7ed');
  bg.addColorStop(0.45, '#fdf2f8');
  bg.addColorStop(1, '#eef2ff');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = '#f3c7d7';
  ctx.lineWidth = 1;
  for (let x = 24; x < width; x += 34) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 60, height);
    ctx.stroke();
  }
  for (let y = 26; y < height; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + 42);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#111827';
  ctx.font = '800 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Story map', 22, 32);
  ctx.font = '600 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText(fitText(ctx, `${hunt.title} · ${stops.length} stops`, width - 44), 22, 50);

  if (stops.length < 2) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '600 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Add coordinates to at least two stops to draw the route.', 22, height / 2);
    return;
  }

  const padX = 46;
  const padTop = 78;
  const padBottom = 54;
  const lats = stops.map(s => s.lat);
  const lons = stops.map(s => s.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(maxLat - minLat, 0.0008);
  const lonSpan = Math.max(maxLon - minLon, 0.0008);
  const mapX = (lon: number) => padX + ((lon - minLon) / lonSpan) * (width - padX * 2);
  const mapY = (lat: number) => padTop + (1 - ((lat - minLat) / latSpan)) * (height - padTop - padBottom);
  const points = stops.map((s, index) => ({
    stop: s,
    index,
    x: mapX(s.lon),
    y: mapY(s.lat),
  }));

  ctx.save();
  ctx.setLineDash([10, 9]);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#db2777';
  ctx.shadowColor = 'rgba(219, 39, 119, 0.22)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
  ctx.restore();

  points.forEach((point, index) => {
    const icon = PROMPT_ICONS[point.stop.prompt.kind] ?? '📍';

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = index === 0 ? '#22c55e' : index === points.length - 1 ? '#f59e0b' : '#db2777';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), point.x, point.y);

    ctx.font = '18px system-ui, Apple Color Emoji, Segoe UI Emoji, sans-serif';
    ctx.fillText(icon, point.x + 20, point.y - 18);

    const label = fitText(ctx, point.stop.title, 112);
    const labelWidth = Math.min(124, Math.max(58, ctx.measureText(label).width + 16));
    const labelX = Math.max(8, Math.min(width - labelWidth - 8, point.x - labelWidth / 2));
    const labelY = Math.max(58, Math.min(height - 34, point.y + 25));

    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.10)';
    ctx.shadowBlur = 8;
    roundedRect(ctx, labelX, labelY, labelWidth, 24, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#111827';
    ctx.font = '700 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, labelX + labelWidth / 2, labelY + 12);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '700 10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Generated from stop coordinates · venue artwork map comes next', 22, height - 18);
}

export default function HuntRouteCanvas({ hunt, className }: HuntRouteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!canvas || !wrapper) return;

    const draw = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = Math.max(1, Math.round(rect.width));
      const cssHeight = 260;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRouteMap(ctx, hunt, cssWidth, cssHeight);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [hunt]);

  const hasRoute = hunt.stops.filter(hasUsableCoords).length >= 2;
  if (!hasRoute) return null;

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="block w-full rounded-3xl border shadow-sm bg-muted"
        aria-label={`Illustrated route map for ${hunt.title}`}
      />
    </div>
  );
}
