import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fetchChatCompletion, extractJsonBlock } from "../_lib/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, images } = await req.json();

    if (!url && (!images || images.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Either url or images must be provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let content = '';
    const userMessages: any[] = [];

    // Fetch URL content if provided
    if (url) {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000);
        content = `Website content from ${url}:\n${textContent}`;
      } catch (error) {
        console.error('Failed to fetch URL:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch the provided URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Prepare messages with images if provided
    if (images && images.length > 0) {
      userMessages.push({ role: 'user', content: [{ type: 'text', text: content || 'Extract activity information from these images:' }] });
      for (const imageUrl of images) {
        userMessages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }] });
      }
    } else {
      userMessages.push({ role: 'user', content: content });
    }

    const systemPrompt = `You are an expert at extracting structured information about family activities, events, and places from websites and images.

Extract and return ONLY a valid JSON object with these fields (use null for missing data):
{
  "name": "Activity name",
  "description": "Detailed description",
  "activityType": ["outdoor", "indoor", "museum", "park", "playground", "sports", "arts", "educational", "entertainment"],
  "ageBuckets": ["0-2", "3-5", "6-8", "9-12", "13+"],
  "minPrice": 0.00,
  "maxPrice": 10.00,
  "address": "Full address",
  "environment": "inside" or "outside" or "both",
  "wheelchair": true/false,
  "stroller": true/false,
  "restrooms": true/false,
  "changingTable": true/false,
  "urlmoreinfo": "original URL if available"
}

Guidelines:
- Include multiple activity types if applicable
- Include all relevant age groups
- Prices in EUR (convert if needed)
- Be descriptive but concise in description
- Return ONLY the JSON object, no other text
- If information is not found, use null or empty array`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(userMessages) ? userMessages : [{ role: 'user', content: content }])
    ];

    let aiText: string;
    try {
      aiText = await fetchChatCompletion({ messages, openAImodel: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.includes('Rate limit') ? 429 : msg.includes('requires payment') ? 402 : 500;
      return new Response(
        JSON.stringify({ error: msg }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jsonStr = extractJsonBlock(aiText);

    let parsedData;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', aiText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', rawContent: aiText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
