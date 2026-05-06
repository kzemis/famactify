// Hunt postcard renderer — turns a finished hunt + attempt into a shareable
// PNG blob (1080×1350, portrait, social-friendly aspect).
//
// Usage:
//   const blob = await renderHuntPostcard({ hunt, attempt, profileName });
//   const file = new File([blob], 'postcard.png', { type: 'image/png' });
//   if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], ... });
//
// All rendering is offscreen. Returns null if running in an environment without
// canvas support (extremely rare; we fall back to a text share at the call site).

import type { ScavengerHunt, HuntAttempt, BadgeTier } from '@/types/hunt';

const W = 1080;
const H = 1350;

interface RenderOpts {
  hunt: ScavengerHunt;
  attempt: HuntAttempt;
  profileName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y,     x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x,     y + h, rr);
  ctx.arcTo(x,     y + h, x,     y,     rr);
  ctx.arcTo(x,     y,     x + w, y,     rr);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, radius = 24) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.clip();
  // object-fit: cover
  const ar = img.width / img.height;
  const targetAr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ar > targetAr) {
    sw = img.height * targetAr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetAr;
    const cropSlack = Math.max(0, img.height - sh);
    const topWeightedCrop = img.height / img.width > 1.35 && targetAr > ar;
    sy = topWeightedCrop ? cropSlack * 0.12 : cropSlack / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function drawContainedImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2): number {
  const words = text.split(' ');
  let line = '';
  let lines: string[] = [];
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines) lines.push(line);
  // ellipsis if we ran out of room
  if (lines.length === maxLines && line && words.indexOf(line.split(' ').pop()!) !== words.length - 1) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  for (const ln of lines) {
    ctx.fillText(ln, x, y);
    y += lineHeight;
  }
  return y;
}

function tierFor(scorePct: number): BadgeTier {
  if (scorePct >= 1.0) return 'gold';
  if (scorePct >= 0.75) return 'silver';
  return 'bronze';
}

const TIER_DISPLAY: Record<BadgeTier, { label: string; bg: string; fg: string }> = {
  gold:   { label: 'GOLD',   bg: '#fef3c7', fg: '#92400e' },
  silver: { label: 'SILVER', bg: '#e5e7eb', fg: '#374151' },
  bronze: { label: 'BRONZE', bg: '#fed7aa', fg: '#9a3412' },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

function drawMemoryCollage(
  ctx: CanvasRenderingContext2D,
  imgs: { img: HTMLImageElement; kind: 'photo' | 'drawing' }[],
) {
  if (imgs.length === 0) return;

  if (imgs.length === 1) {
    drawCover(ctx, imgs[0].img, 0, 0, W, H, 0);
  } else if (imgs.length === 2) {
    const h = Math.floor(H / 2);
    drawCover(ctx, imgs[0].img, 0, 0, W, h, 0);
    drawCover(ctx, imgs[1].img, 0, h, W, H - h, 0);
  } else if (imgs.length === 3) {
    const leftW = Math.floor(W * 0.62);
    const rightW = W - leftW;
    drawCover(ctx, imgs[0].img, 0, 0, leftW, H, 0);
    drawCover(ctx, imgs[1].img, leftW, 0, rightW, Math.floor(H / 2), 0);
    drawCover(ctx, imgs[2].img, leftW, Math.floor(H / 2), rightW, Math.ceil(H / 2), 0);
  } else {
    const tileW = Math.floor(W / 2);
    const tileH = Math.floor(H / 2);
    drawCover(ctx, imgs[0].img, 0, 0, tileW, tileH, 0);
    drawCover(ctx, imgs[1].img, tileW, 0, W - tileW, tileH, 0);
    drawCover(ctx, imgs[2].img, 0, tileH, tileW, H - tileH, 0);
    drawCover(ctx, imgs[3].img, tileW, tileH, W - tileW, H - tileH, 0);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const top = ctx.createLinearGradient(0, 0, 0, 520);
  top.addColorStop(0, 'rgba(17,24,39,0.82)');
  top.addColorStop(0.48, 'rgba(17,24,39,0.36)');
  top.addColorStop(1, 'rgba(17,24,39,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, 540);
  ctx.restore();
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function renderHuntPostcard(opts: RenderOpts): Promise<Blob | null> {
  const { hunt, attempt } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const margin = 56;

  // Collect up to 4 visual memories before drawing so the image can become the canvas.
  const visuals: { url: string; kind: 'photo' | 'drawing' }[] = [];
  for (const r of attempt.results) {
    if (r.photoDataUrl)   visuals.push({ url: r.photoDataUrl,   kind: 'photo' });
    if (r.drawingDataUrl) visuals.push({ url: r.drawingDataUrl, kind: 'drawing' });
    if (visuals.length >= 4) break;
  }

  const imgs: { img: HTMLImageElement; kind: 'photo' | 'drawing' }[] = [];
  for (const v of visuals) {
    try {
      const img = await loadImage(v.url);
      imgs.push({ img, kind: v.kind });
    } catch { /* skip */ }
  }

  const logoUrl = hunt.hostLogo || hunt.sponsors?.find(sponsor => sponsor.logo)?.logo;
  let logoImg: HTMLImageElement | null = null;
  if (logoUrl) {
    try {
      logoImg = await loadImage(logoUrl);
    } catch { /* skip logo if it cannot be canvas-loaded */ }
  }

  const totalStops = hunt.stops.length || attempt.results.length;
  const decided = attempt.results.filter(r => !r.skipped);
  const correct = decided.filter(r => r.isCorrect).length;
  const scorePct = totalStops > 0 ? correct / totalStops : 0;
  const tier = tierFor(scorePct);
  const tierMeta = TIER_DISPLAY[tier];
  const dateStr = fmtDate(attempt.completedAt ?? attempt.startedAt);
  const subtitle = [dateStr, hunt.city].filter(Boolean).join('  ·  ');
  const hasVisuals = imgs.length > 0;

  if (hasVisuals) {
    drawMemoryCollage(ctx, imgs);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fff7ed');
    bg.addColorStop(0.55, '#fdf2f8');
    bg.addColorStop(1, '#faf5ff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    roundedRectPath(ctx, margin, 420, W - margin * 2, 520, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 28px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, hunt.blurb, margin + 48, 480, W - margin * 2 - 96, 42, 7);
    ctx.restore();
  }

  // ── Memory-first text overlay ───────────────────────────────────────────
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.shadowColor = hasVisuals ? 'rgba(0,0,0,0.55)' : 'transparent';
  ctx.shadowBlur = hasVisuals ? 12 : 0;
  ctx.shadowOffsetY = hasVisuals ? 3 : 0;

  ctx.fillStyle = hasVisuals ? '#ffffff' : '#ec4899';
  ctx.font = '800 30px system-ui, -apple-system, sans-serif';
  ctx.fillText('FamActify', margin, 54);
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillStyle = hasVisuals ? 'rgba(255,255,255,0.78)' : '#9ca3af';
  ctx.fillText('· Scavenger Hunt', margin + 155, 63);

  if (logoImg) {
    ctx.save();
    const logoSize = 84;
    const logoX = W - margin - logoSize;
    const logoY = 42;
    roundedRectPath(ctx, logoX, logoY, logoSize, logoSize, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    roundedRectPath(ctx, logoX + 10, logoY + 10, logoSize - 20, logoSize - 20, 16);
    ctx.clip();
    drawContainedImage(ctx, logoImg, logoX + 10, logoY + 10, logoSize - 20, logoSize - 20);
    ctx.restore();
  }

  let textY = 132;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = hasVisuals ? 'rgba(0,0,0,0.62)' : 'transparent';
  ctx.shadowBlur = hasVisuals ? 16 : 0;
  ctx.fillStyle = hasVisuals ? '#ffffff' : '#111827';
  ctx.font = '900 58px system-ui, sans-serif';
  textY = wrapText(ctx, hunt.title, margin, textY, W - margin * 2 - (logoImg ? 90 : 0), 64, 2);
  textY += 12;
  ctx.font = '600 27px system-ui, sans-serif';
  ctx.fillStyle = hasVisuals ? 'rgba(255,255,255,0.88)' : '#6b7280';
  ctx.fillText(subtitle, margin, textY);

  textY += 54;
  ctx.shadowColor = 'transparent';
  const pillH = 58;
  ctx.font = 'bold 25px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
  const pillLabel = `${tierMeta.label}  ·  ${correct}/${totalStops} stops`;
  const pillW = Math.min(W - margin * 2, ctx.measureText(pillLabel).width + 48);
  roundedRectPath(ctx, margin, textY, pillW, pillH, pillH / 2);
  ctx.fillStyle = tierMeta.bg;
  ctx.fill();
  ctx.fillStyle = tierMeta.fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillLabel, margin + 24, textY + pillH / 2);

  ctx.shadowColor = 'transparent';

  // ── Output blob ─────────────────────────────────────────────────────────
  return new Promise(resolve => {
    canvas.toBlob(b => resolve(b), 'image/png', 0.92);
  });
}
