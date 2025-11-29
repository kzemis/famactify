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
    const { answers, interests } = await req.json();
    
    if (!answers && !interests) {
      return new Response(
        JSON.stringify({ error: 'User answers or interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating recommendations for:', { answers, interests });

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Fetch activities data from the JSON file
    const activitiesResponse = await fetch('https://gitlab.com/parent-kid/famactify/-/raw/06789142376ff2d1330b95ec91c3d5986ed11c64/public/data/activities/activities-trails.json');
    const activitiesData = await activitiesResponse.json();
    
    console.log('Fetched activities data:', activitiesData.length || 0, 'activities');

    const systemPrompt = `You are a family activity recommendation assistant. Based on the user's interests and answers to planning questions, analyze the provided activities database and recommend 5-10 activities that best match their preferences.

RULES:
1. Recommend between 5-10 activities from the provided database
2. Consider all user preferences: location, dates, budget, group size, interests
3. Prioritize activities that align with their stated interests
4. Ensure variety in the recommendations
5. Consider practical factors like timing and location

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "id": "activity_id_from_database",
      "title": "Activity Title",
      "description": "Why this matches their preferences",
      "location": "Location name",
      "date": "Suggested date",
      "time": "Suggested time",
      "price": "Price information",
      "image": "Image URL from database",
      "matchReason": "Brief explanation of why this is a good match"
    }
  ]
}

IMPORTANT: 
- Use actual data from the activities database provided
- Include the original activity ID and image URL
- Adapt dates/times based on user preferences
- Return ONLY the JSON object, no additional text or markdown.`;

    const userPrompt = `User Interests: "${interests || 'Not specified'}"

User Answers to Planning Questions:
${answers ? Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'No specific answers provided'}

Available Activities Database:
${JSON.stringify(activitiesData, null, 2)}

Generate personalized activity recommendations based on this information.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.content?.[0]?.text;
    
    console.log('Raw Claude AI response:', aiResponse);

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = aiResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const recommendations = JSON.parse(jsonStr);
    
    console.log('Parsed recommendations:', recommendations);

    // Validate the response structure
    if (!recommendations.recommendations || !Array.isArray(recommendations.recommendations)) {
      throw new Error('Invalid response format from AI');
    }

    return new Response(
      JSON.stringify(recommendations),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recommendations function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate recommendations', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
