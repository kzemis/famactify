import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildForwardUrl(sp: URLSearchParams) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  const q = sp.get('q');
  if (!q) throw new Error('Missing query parameter: q');
  url.searchParams.set('q', q);
  url.searchParams.set('format', sp.get('format') ?? 'jsonv2');
  url.searchParams.set('addressdetails', sp.get('addressdetails') ?? '1');
  url.searchParams.set('limit', sp.get('limit') ?? '5');
  // Allow a few safe passthrough filters
  const passthrough = ['countrycodes', 'viewbox', 'bounded', 'extratags', 'namedetails'];
  for (const key of passthrough) {
    const v = sp.get(key);
    if (v !== null) url.searchParams.set(key, v);
  }
  const lang = sp.get('lang') || sp.get('accept-language');
  if (lang) url.searchParams.set('accept-language', lang);
  return url;
}

function buildReverseUrl(sp: URLSearchParams) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  const lat = sp.get('lat');
  const lon = sp.get('lon');
  if (!lat || !lon) throw new Error('Missing coordinates: lat and lon');
  url.searchParams.set('lat', lat);
  url.searchParams.set('lon', lon);
  url.searchParams.set('format', sp.get('format') ?? 'jsonv2');
  url.searchParams.set('addressdetails', sp.get('addressdetails') ?? '1');
  url.searchParams.set('zoom', sp.get('zoom') ?? '18');
  const lang = sp.get('lang') || sp.get('accept-language');
  if (lang) url.searchParams.set('accept-language', lang);
  return url;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const sp = url.searchParams;

    let target: URL;
    // Detect forward vs reverse by presence of q vs lat/lon
    if (sp.get('q')) {
      target = buildForwardUrl(sp);
    } else if (sp.get('lat') && sp.get('lon')) {
      target = buildReverseUrl(sp);
    } else {
      return new Response(
        JSON.stringify({ error: 'Provide either q for forward geocoding or lat & lon for reverse geocoding' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userAgent = Deno.env.get('NOMINATIM_USER_AGENT') || 'FamActify-SupabaseProxy/1.0 (+https://example.com/contact)';

    const res = await fetch(target.toString(), {
      headers: {
        'User-Agent': userAgent,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const status = res.status === 429 ? 429 : 502;
      const message = res.status === 429 ? 'Upstream rate limit exceeded' : 'Upstream error from Nominatim';
      return new Response(
        JSON.stringify({ error: message, upstreamStatus: res.status, details: text.slice(0, 500) }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await res.text();
    // Pass through JSON or plain text as-is
    const contentType = res.headers.get('content-type') || 'application/json; charset=utf-8';
    return new Response(body, { headers: { ...corsHeaders, 'Content-Type': contentType } });
  } catch (error) {
    console.error('nominatim-proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

