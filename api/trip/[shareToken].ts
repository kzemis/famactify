/**
 * Vercel Edge Function — /trip/:shareToken
 *
 * For social media bots (WhatsApp, Telegram, Slack, etc.) → returns HTML
 * with Open Graph meta tags so link previews show the trip name + description.
 *
 * For regular browsers → serves the built index.html so React handles routing.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Bots that crawl URLs to generate link previews
const BOT_UA = /facebookexternalhit|Twitterbot|WhatsApp|TelegramBot|Slackbot|LinkedInBot|Pinterest|Discordbot|vkShare|W3C_Validator|Snapchat/i;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const shareToken = Array.isArray(req.query.shareToken)
    ? req.query.shareToken[0]
    : req.query.shareToken ?? '';

  const ua = (req.headers['user-agent'] || '').toString();
  const isBot = BOT_UA.test(ua);

  // ---------------------------------------------------------------------------
  // For bots — fetch trip data and return HTML with OG meta tags
  // ---------------------------------------------------------------------------
  if (isBot && shareToken) {
    const supabaseUrl  = process.env.SUPABASE_URL  || process.env.VITE_SUPABASE_URL  || '';
    const supabaseKey  = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

    let tripName    = 'Family Plan';
    let tripStops   = 0;
    let tripImage   = '';

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data } = await supabase
          .from('shared_trips_view')
          .select('name, total_events, events')
          .eq('share_token', shareToken)
          .maybeSingle();

        if (data) {
          tripName  = data.name || tripName;
          tripStops = data.total_events || 0;
          // Try to get the first activity image for OG image
          const events = Array.isArray(data.events) ? data.events : [];
          const firstImg = events.find((e: any) => e.image || e.imageurlthumb);
          if (firstImg) tripImage = firstImg.image || firstImg.imageurlthumb || '';
        }
      } catch {
        // Proceed with defaults
      }
    }

    const appUrl  = req.headers.host ? `https://${req.headers.host}` : 'https://famactify.app';
    const tripUrl = `${appUrl}/trip/${shareToken}`;
    const ogImage = tripImage || `${appUrl}/og-cover.jpg`;
    const desc    = tripStops > 0
      ? `A family plan with ${tripStops} ${tripStops === 1 ? 'activity' : 'activities'}. Open in FamActify to view details and route.`
      : 'A family activity plan. Open in FamActify to view details.';

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('cache-control', 'public, max-age=300');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>🗺️ ${escHtml(tripName)} — FamActify</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="FamActify" />
  <meta property="og:title"       content="🗺️ ${escHtml(tripName)}" />
  <meta property="og:description" content="${escHtml(desc)}" />
  <meta property="og:url"         content="${escHtml(tripUrl)}" />
  <meta property="og:image"       content="${escHtml(ogImage)}" />

  <!-- Twitter / X -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="🗺️ ${escHtml(tripName)}" />
  <meta name="twitter:description" content="${escHtml(desc)}" />
  <meta name="twitter:image"       content="${escHtml(ogImage)}" />

  <!-- Instant redirect for real browsers -->
  <meta http-equiv="refresh" content="0;url=${escHtml(tripUrl)}?spa=1" />
</head>
<body>
  <script>window.location.replace(${JSON.stringify(tripUrl + '?spa=1')});</script>
  <p style="font-family:sans-serif;padding:2rem">
    <a href="${escHtml(tripUrl)}">View trip: ${escHtml(tripName)}</a>
  </p>
</body>
</html>`);
  }

  // ---------------------------------------------------------------------------
  // For regular browsers — serve the built React SPA (index.html)
  // ---------------------------------------------------------------------------
  try {
    const indexPath = path.join(process.cwd(), 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf-8');
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      return res.status(200).send(html);
    }
  } catch {
    // Fall through to redirect
  }

  // Fallback — redirect to app root (React Router handles the path)
  return res.redirect(302, `/?t=${encodeURIComponent(shareToken)}`);
}

/** Escape HTML special characters for inline attribute use */
function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
