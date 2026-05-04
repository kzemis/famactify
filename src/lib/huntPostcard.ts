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
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
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

const TIER_DISPLAY: Record<BadgeTier, { label: string; emoji: string; bg: string; fg: string }> = {
  gold:   { label: 'GOLD',   emoji: '🏆', bg: '#fef3c7', fg: '#92400e' },
  silver: { label: 'SILVER', emoji: '🥈', bg: '#e5e7eb', fg: '#374151' },
  bronze: { label: 'BRONZE', emoji: '🥉', bg: '#fed7aa', fg: '#9a3412' },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function renderHuntPostcard(opts: RenderOpts): Promise<Blob | null> {
  const { hunt, attempt, profileName } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ── Background gradient (warm pink → amber) ─────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   '#fff7ed'); // amber-50
  bg.addColorStop(0.6, '#fdf2f8'); // pink-50
  bg.addColorStop(1,   '#faf5ff'); // purple-50
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative blob top-right
  ctx.save();
  ctx.globalAlpha = 0.35;
  const blob = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 380);
  blob.addColorStop(0, '#f9a8d4');
  blob.addColorStop(1, 'transparent');
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── Header ──────────────────────────────────────────────────────────────
  const margin = 64;
  let cursorY = 80;

  ctx.fillStyle = '#ec4899'; // primary pink
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  const brandWidth = ctx.measureText('FamActify').width;
  ctx.fillText('FamActify', margin, cursorY);

  ctx.fillStyle = '#9ca3af'; // muted
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText('· Scavenger Hunt', margin + brandWidth + 18, cursorY + 16);

  cursorY += 70;

  // Cover emoji card top-right
  ctx.save();
  const emojiSize = 100;
  const emojiX = W - margin - emojiSize;
  const emojiY = 70;
  roundedRectPath(ctx, emojiX, emojiY, emojiSize, emojiSize, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.font = '64px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hunt.coverEmoji, emojiX + emojiSize / 2, emojiY + emojiSize / 2 + 4);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // ── Hero copy ───────────────────────────────────────────────────────────
  // "We did it!" eyebrow
  ctx.fillStyle = '#9ca3af';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('WE DID IT!', margin, cursorY);
  cursorY += 36;

  // Hunt title (wraps to 2 lines)
  ctx.fillStyle = '#111827';
  ctx.font = '900 56px system-ui, sans-serif';
  cursorY = wrapText(ctx, hunt.title, margin, cursorY, W - margin * 2, 64, 2);
  cursorY += 12;

  // "{kid name} · {date} · {city}"
  const dateStr = fmtDate(attempt.completedAt ?? attempt.startedAt);
  const subtitle = [profileName, dateStr, hunt.city].filter(Boolean).join('  ·  ');
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillText(subtitle, margin, cursorY);
  cursorY += 56;

  // ── Badge tier pill ─────────────────────────────────────────────────────
  const totalStops = hunt.stops.length || attempt.results.length;
  const decided = attempt.results.filter(r => !r.skipped);
  const correct = decided.filter(r => r.isCorrect).length;
  const scorePct = totalStops > 0 ? correct / totalStops : 0;
  const tier = tierFor(scorePct);
  const tierMeta = TIER_DISPLAY[tier];
  const pillH = 64;
  ctx.font = 'bold 28px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
  const pillLabel = `${tierMeta.emoji}  ${tierMeta.label}  ·  ${correct}/${totalStops} stops`;
  const pillW = ctx.measureText(pillLabel).width + 56;
  ctx.save();
  roundedRectPath(ctx, margin, cursorY, pillW, pillH, pillH / 2);
  ctx.fillStyle = tierMeta.bg;
  ctx.fill();
  ctx.fillStyle = tierMeta.fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(pillLabel, margin + 28, cursorY + pillH / 2);
  ctx.restore();
  cursorY += pillH + 36;
  ctx.textBaseline = 'top';

  // ── Photo / drawing collage ─────────────────────────────────────────────
  // Collect up to 4 visual memories
  const visuals: { url: string; kind: 'photo' | 'drawing' }[] = [];
  for (const r of attempt.results) {
    if (r.photoDataUrl)   visuals.push({ url: r.photoDataUrl,   kind: 'photo' });
    if (r.drawingDataUrl) visuals.push({ url: r.drawingDataUrl, kind: 'drawing' });
    if (visuals.length >= 4) break;
  }

  const collageY = cursorY;
  const collageH = 600;
  const collageX = margin;
  const collageW = W - margin * 2;

  if (visuals.length > 0) {
    // Try to load every image; skip ones that fail
    const imgs: { img: HTMLImageElement; kind: 'photo' | 'drawing' }[] = [];
    for (const v of visuals) {
      try {
        const img = await loadImage(v.url);
        imgs.push({ img, kind: v.kind });
      } catch { /* skip */ }
    }

    if (imgs.length === 1) {
      drawCover(ctx, imgs[0].img, collageX, collageY, collageW, collageH, 32);
    } else if (imgs.length === 2) {
      const w = (collageW - 16) / 2;
      drawCover(ctx, imgs[0].img, collageX,            collageY, w, collageH, 28);
      drawCover(ctx, imgs[1].img, collageX + w + 16,   collageY, w, collageH, 28);
    } else if (imgs.length === 3) {
      // Big left, two stacked right
      const big = (collageW - 16) * 0.6;
      const small = collageW - 16 - big;
      drawCover(ctx, imgs[0].img, collageX,             collageY,                   big,   collageH,           28);
      drawCover(ctx, imgs[1].img, collageX + big + 16,  collageY,                   small, (collageH - 16) / 2, 24);
      drawCover(ctx, imgs[2].img, collageX + big + 16,  collageY + (collageH - 16) / 2 + 16, small, (collageH - 16) / 2, 24);
    } else {
      // 2x2
      const w = (collageW - 16) / 2;
      const h = (collageH - 16) / 2;
      drawCover(ctx, imgs[0].img, collageX,        collageY,        w, h, 24);
      drawCover(ctx, imgs[1].img, collageX + w+16, collageY,        w, h, 24);
      drawCover(ctx, imgs[2].img, collageX,        collageY + h+16, w, h, 24);
      drawCover(ctx, imgs[3].img, collageX + w+16, collageY + h+16, w, h, 24);
    }

    // Tiny "drawing" badge overlay on drawings
    imgs.forEach(({ kind }, i) => {
      if (kind !== 'drawing') return;
      // approximate position — put a small badge in the top-left of each cell
      // (skipped per-cell for brevity; one overlay isn't critical here)
    });
  } else {
    // Empty collage placeholder — soft tile with hunt blurb
    ctx.save();
    roundedRectPath(ctx, collageX, collageY, collageW, collageH, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 28px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, hunt.blurb, collageX + 52, collageY + 72, collageW - 104, 40, 7);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
  }

  cursorY = collageY + collageH + 32;

  // ── Footer ──────────────────────────────────────────────────────────────
  // by {host} · {city}
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 24px system-ui, sans-serif';
  const credit = `by ${hunt.hostName}`;
  ctx.fillText(credit, margin, cursorY);
  cursorY += 36;

  // CTA URL (right-aligned, primary pink)
  const url = `famactify.app/hunts/${hunt.slug}`;
  ctx.fillStyle = '#ec4899';
  ctx.font = '600 26px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(url, W - margin, H - margin - 30);

  // "Walk it yourself →" left-aligned hook
  ctx.fillStyle = '#111827';
  ctx.font = '700 28px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Walk it yourself →', margin, H - margin - 30);

  // ── Output blob ─────────────────────────────────────────────────────────
  return new Promise(resolve => {
    canvas.toBlob(b => resolve(b), 'image/png', 0.92);
  });
}
