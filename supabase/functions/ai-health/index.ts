import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchChatCompletion } from "../_lib/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_PROVIDER = (Deno.env.get('AI_PROVIDER') || 'lovable').toLowerCase();
    const start = Date.now();

    let aiText = '';
    try {
      aiText = await fetchChatCompletion({
        messages: [
          { role: 'system', content: 'You are a simple health-check assistant.' },
          { role: 'user', content: 'Reply with the single word: OK' },
        ],
        temperature: 0,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.includes('Rate limit') ? 429 : msg.includes('requires payment') ? 402 : 500;
      return new Response(
        JSON.stringify({ ok: false, provider: AI_PROVIDER, error: msg }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const durationMs = Date.now() - start;
    const ok = typeof aiText === 'string' && aiText.toUpperCase().includes('OK');

    return new Response(
      JSON.stringify({ ok, provider: AI_PROVIDER, latencyMs: durationMs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

