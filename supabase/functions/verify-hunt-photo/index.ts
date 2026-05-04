import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type VerificationResponse = {
  verified: boolean;
  confidence: number;
  needsReview: boolean;
  reason: string;
  model?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clampConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function extractJson(text: string): any {
  const cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');
  return JSON.parse(cleaned);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl, photoSubject, threshold } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return jsonResponse({ error: 'imageDataUrl is required' }, 400);
    }
    if (!photoSubject || typeof photoSubject !== 'string') {
      return jsonResponse({ error: 'photoSubject is required' }, 400);
    }
    if (!imageDataUrl.startsWith('data:image/')) {
      return jsonResponse({ error: 'imageDataUrl must be a data:image/* URL' }, 400);
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return jsonResponse({
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: 'OPENAI_API_KEY is not configured for verify-hunt-photo.',
      } satisfies VerificationResponse, 503);
    }

    const model = Deno.env.get('OPENAI_VISION_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    const matchThreshold = typeof threshold === 'number' ? Math.max(0.1, Math.min(0.95, threshold)) : 0.72;

    const prompt = `You are a strict but child-friendly scavenger hunt photo verifier.

Task: decide whether the submitted image semantically matches this requested photo subject:
"${photoSubject}"

Return ONLY valid JSON with:
{
  "matchesSubject": boolean,
  "confidence": number between 0 and 1,
  "containsPeopleFaces": boolean,
  "reason": "one concise sentence"
}

Guidelines:
- Match broad visual semantics, not exact pixels.
- Accept reasonable child submissions when the subject is visibly present.
- If the image is too blurry/dark/ambiguous, set matchesSubject=false and confidence <= 0.55.
- If visible people's faces are prominent, flag containsPeopleFaces=true for privacy review.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      return jsonResponse({
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: `Vision model error: ${aiResponse.status} ${errorText.slice(0, 240)}`,
        model,
      } satisfies VerificationResponse, aiResponse.status === 429 ? 429 : 502);
    }

    const data = await aiResponse.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return jsonResponse({
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: 'Vision model returned an empty response.',
        model,
      } satisfies VerificationResponse, 502);
    }

    let parsed: any;
    try {
      parsed = extractJson(content);
    } catch {
      return jsonResponse({
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: 'Vision model returned non-JSON output.',
        model,
      } satisfies VerificationResponse, 502);
    }

    const confidence = clampConfidence(parsed.confidence);
    const matchesSubject = !!parsed.matchesSubject;
    const containsPeopleFaces = !!parsed.containsPeopleFaces;
    const verified = matchesSubject && confidence >= matchThreshold && !containsPeopleFaces;
    const needsReview = !verified;
    const reason = typeof parsed.reason === 'string'
      ? parsed.reason.slice(0, 280)
      : verified
        ? 'Image appears to match the requested subject.'
        : 'Image needs manual review.';

    return jsonResponse({
      verified,
      confidence,
      needsReview,
      reason: containsPeopleFaces ? `${reason} Visible faces detected; review for privacy.` : reason,
      model,
    } satisfies VerificationResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      verified: false,
      confidence: 0,
      needsReview: true,
      reason: message,
    } satisfies VerificationResponse, 500);
  }
});
