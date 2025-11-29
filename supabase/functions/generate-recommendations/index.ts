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

    // Fetch activities data from multiple JSON files
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    
    // Extract project ID from supabase URL and construct lovableproject URL
    // Example: https://ybzyhhhfykvbxakbrspf.supabase.co -> https://ybzyhhhfykvbxakbrspf.lovableproject.com
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    const projectUrl = `https://${projectId}.lovableproject.com`;
    
    const dataUrls = [
      `${projectUrl}/data/activities-trails.json`,
      `${projectUrl}/data/activities-transformed.json`,
      `${projectUrl}/data/activities-spots-1.json`,
      `${projectUrl}/data/activities-bs-transformed.json`
    ];
    
    console.log('Fetching activities from:', dataUrls);
    
    // Fetch all JSON files in parallel
    const responses = await Promise.all(
      dataUrls.map(url => fetch(url).catch(err => {
        console.error(`Failed to fetch ${url}:`, err);
        return null;
      }))
    );
    
    // Parse all responses and combine the data
    const allActivitiesData = [];
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response && response.ok) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            allActivitiesData.push(...data);
          } else {
            allActivitiesData.push(data);
          }
          console.log(`Fetched data from file ${i + 1}:`, Array.isArray(data) ? data.length : 1, 'activities');
        } catch (err) {
          console.error(`Failed to parse JSON from file ${i + 1}:`, err);
        }
      }
    }
    
    console.log('Total activities data:', allActivitiesData.length, 'activities');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    
    const systemPrompt = `You are a family activity recommendation assistant for Latvia. Based on the user's interests and answers to planning questions, analyze the provided activities database and recommend 5-10 activities for a SINGLE DAY itinerary.

RULES:
1. Recommend between 5-10 activities from the provided database
2. Focus on creating a ONE-DAY itinerary (activities should fit within a single day)
3. Consider all user preferences: location in Latvia, budget in EUR, group size, interests
4. Prioritize activities that align with their stated interests
5. Ensure activities can be completed in one day with reasonable travel time between them
6. Consider practical factors like timing, location proximity, and logical sequencing for a day trip

CRITICAL DATE FORMAT REQUIREMENT:
- TODAY IS: ${todayStr} (${dayName})
- The "date" field MUST be in ISO format: YYYY-MM-DD (e.g., "2025-12-07")
- Date calculation rules:
  * "next Saturday" = the Saturday of NEXT week (7 days from the upcoming Saturday, NOT the closest Saturday)
  * "this Saturday" = the closest upcoming Saturday (could be today if today is Saturday)
  * "next week" = 7 days from today
  * Always add 7 days when the user says "next [day]" to ensure it's truly the next occurrence
- Never return natural language dates like "Next Saturday" or "This weekend"
- Always calculate the exact date from today (${todayStr})

EXAMPLES:
- If today is Saturday 2025-11-29 and user says "next Saturday", return: "2025-12-06"
- If today is Friday 2025-11-29 and user says "this Saturday", return: "2025-11-30"
- If today is Friday 2025-11-29 and user says "next Saturday", return: "2025-12-07"

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "id": "activity_id_from_database",
      "title": "Activity Title",
      "description": "Why this matches their preferences",
      "location": "Location name",
      "date": "YYYY-MM-DD",
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
- The date field must ALWAYS be in ISO format (YYYY-MM-DD)
- Return ONLY the JSON object, no additional text or markdown.`;

    const userPrompt = `User Interests: "${interests || 'Not specified'}"

User Answers to Planning Questions:
${answers ? Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'No specific answers provided'}

Available Activities Database:
${JSON.stringify(allActivitiesData, null, 2)}

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
