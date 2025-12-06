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
    const { interests, maxQuestions = 4 } = await req.json();
    
    if (!interests) {
      return new Response(
        JSON.stringify({ error: 'Interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating questions for interests:', interests);
    console.log('Max questions requested:', maxQuestions);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a family activity planning assistant for Latvia. Based on the user's interests, generate exactly ${maxQuestions} personalized questions to gather information for planning a ONE-DAY family activity.

RULES:
1. Generate exactly ${maxQuestions} questions
2. Each question should be specific and relevant to their stated interests
3. Questions should help gather practical planning information (location in Latvia, specific date, budget in EUR, group size, preferences, etc.)
4. Make questions conversational and friendly
5. Include helpful placeholder examples using Latvian cities and locations (e.g., Riga, Jurmala, Sigulda)
6. Focus on planning for a SINGLE DAY activity

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "unique_id",
      "title": "Question text?",
      "placeholder": "Example answer",
      "type": "text",
      "icon": "MapPin"
    }
  ]
}

Available icons: MapPin, Calendar, Users, DollarSign, Clock, Heart, Sun, Utensils, Baby, Home

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;

    const userPrompt = `User interests: "${interests}"

Generate personalized questions to help plan their family activities.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
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
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('Raw AI response:', aiResponse);

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

    const questions = JSON.parse(jsonStr);
    
    console.log('Parsed questions:', questions);

    // Validate the response structure
    if (!questions.questions || !Array.isArray(questions.questions)) {
      throw new Error('Invalid response format from AI');
    }

    return new Response(
      JSON.stringify(questions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate questions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});