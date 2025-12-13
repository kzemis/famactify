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
    const { interests, maxQuestions = 4 } = await req.json();
    
    if (!interests) {
      return new Response(
        JSON.stringify({ error: 'Interests are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating questions for interests:', interests);
    console.log('Max questions requested:', maxQuestions);

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

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    let aiText: string;
    try {
      aiText = await fetchChatCompletion({ messages });
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : String(e);
      const status = msg.includes('Rate limit') ? 429 : msg.includes('requires payment') ? 402 : 500;
      return new Response(
        JSON.stringify({ error: msg }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Raw AI response:', aiText);

    const jsonStr = extractJsonBlock(aiText);
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