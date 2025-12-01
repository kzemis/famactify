import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
        
        // Extract text content from HTML (basic extraction)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 10000); // Limit to first 10k chars

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
      userMessages.push({
        type: 'text',
        text: content || 'Extract activity information from these images:'
      });

      for (const imageUrl of images) {
        userMessages.push({
          type: 'image_url',
          image_url: { url: imageUrl }
        });
      }
    } else {
      userMessages.push({
        type: 'text',
        text: content
      });
    }

    // Call Lovable AI to parse the content
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured information about family activities, events, and places from websites and images.

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
- If information is not found, use null or empty array`
          },
          {
            role: 'user',
            content: userMessages
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse content with AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return new Response(
        JSON.stringify({ error: 'No content received from AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Parse the JSON response from AI
    let parsedData;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiContent.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      parsedData = JSON.parse(jsonStr);
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', aiContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', rawContent: aiContent }),
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
