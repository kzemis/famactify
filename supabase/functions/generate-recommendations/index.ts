import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch activities from JSON files, Supabase database, AND Bilesu Serviss API
    console.log('Fetching activities from multiple sources');
    
    // 1. Fetch from JSON files
    const projectId = supabaseUrl.split('//')[1]?.split('.')[0];
    const projectUrl = `https://${projectId}.lovableproject.com`;
    
    const dataUrls = [
      `${projectUrl}/data/activities-trails.json`,
      `${projectUrl}/data/activities-transformed.json`,
      `${projectUrl}/data/activities-spots-1.json`,
      `${projectUrl}/data/activities-bs-transformed.json`
    ];
    
    // Private Bilesu Serviss API endpoint (not exposed publicly)
    const BILESU_SERVISS_API_URL = 'https://www.bilesuserviss.lv/api/action/filter/?types=category,concert,promoter,venue,price&export=category&order=title,desc&fields=category/decoratedTitle,hidden,id,image,link,parentCategoryId,shortImageUrl,title;concert/ageRestriction,badgeData,buyButtonConfig,centerId,country,customDate,customTargetUrl,decoratedTitle,description,descriptionLanguages,descriptionPlain,discount,endTime,eventPlace,feeRange,festivalTitle,id,image,imageUrl,link,localisedEndDate,localisedStartDate,maxAdditionalFee,maxPrice,maxServiceFee,minAdditionalFee,minPrice,minServiceFee,modifiedTimeStamp,originalImageUrl,prices,promoterId,purchaseDescription,rank,salesStatus,salesTime,serviceFeeRange,shopAppUrl,shopUrl,shortImageUrl,shortUrl,showId,specialStatus,startTime,subMode,systemId,templateShort,title,topPosition,trackingUrl,url,venueDecoratedTitle,venueDescription,venueId,venueTitle,video,videoUrl;promoter/address,decoratedTitle,email,externalUrl,id,link,modifiedTimeStamp,originalImageUrl,phone,shortImageUrl,title,url;venue/address,city,coordinates,countryId,county,decoratedTitle,externalUrl,id,image,link,location_country,logoImageUrl,map,modifiedTimeStamp,originalImageUrl,region,title,url&filter=categoryId/1004,1034,1041,1138,1396,1021,1224;concertActive&limit=2000000&start=0&language=eng';
    
    console.log('Fetching activities from JSON files:', dataUrls);
    
    // Fetch all JSON files in parallel
    const responses = await Promise.all(
      dataUrls.map(url => fetch(url).catch(err => {
        console.error(`Failed to fetch ${url}:`, err);
        return null;
      }))
    );
    
    // Parse all responses and combine the data
    const jsonActivitiesData = [];
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (response && response.ok) {
        try {
          const data = await response.json();
          if (Array.isArray(data)) {
            jsonActivitiesData.push(...data);
          } else {
            jsonActivitiesData.push(data);
          }
          console.log(`Fetched data from JSON file ${i + 1}:`, Array.isArray(data) ? data.length : 1, 'activities');
        } catch (err) {
          console.error(`Failed to parse JSON from file ${i + 1}:`, err);
        }
      }
    }
    
    console.log('Total activities from JSON files:', jsonActivitiesData.length);
    
    // 2. Fetch from Bilesu Serviss API (private data source)
    console.log('Fetching activities from Bilesu Serviss API');
    let bilesuActivitiesData = [];
    try {
      const bilesuResponse = await fetch(BILESU_SERVISS_API_URL);
      if (bilesuResponse.ok) {
        const bilesuData = await bilesuResponse.json();
        // The API returns concerts array under concerts key
        if (bilesuData && bilesuData.concerts && Array.isArray(bilesuData.concerts)) {
          // Transform Bilesu Serviss format to our format
          bilesuActivitiesData = bilesuData.concerts.map((concert: any) => ({
            id: `bilesu-${concert.id}`,
            name: concert.title || concert.decoratedTitle,
            description: concert.descriptionPlain || concert.description || '',
            location_address: concert.venueTitle || concert.eventPlace || '',
            event_starttime: concert.startTime,
            event_endtime: concert.endTime,
            min_price: concert.minPrice,
            max_price: concert.maxPrice,
            imageurlthumb: concert.shortImageUrl || concert.imageUrl || concert.originalImageUrl,
            urlmoreinfo: concert.url || concert.shopUrl,
            activity_type: ['event', 'concert'],
            age_buckets: concert.ageRestriction ? [`${concert.ageRestriction}+`] : []
          }));
          console.log('Fetched and transformed Bilesu Serviss events:', bilesuActivitiesData.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch from Bilesu Serviss API:', err);
      // Don't throw error, just continue with other data sources
    }
    
    // 3. Fetch from Supabase activityspots table
    const { data: dbActivitiesData, error: fetchError } = await supabase
      .from('activityspots')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching activities from Supabase:', fetchError);
      // Don't throw error, just log it and continue with JSON data
    }
    
    const dbActivities = dbActivitiesData || [];
    console.log('Total activities from Supabase database:', dbActivities.length);
    
    // 4. Combine all data sources
    const allActivitiesData = [...jsonActivitiesData, ...bilesuActivitiesData, ...dbActivities];
    console.log('Total combined activities data:', allActivitiesData.length, 'activities');
    console.log('Sources: JSON files:', jsonActivitiesData.length, ', Bilesu Serviss:', bilesuActivitiesData.length, ', Database:', dbActivities.length);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    
    // Extract user's requested date from answers
    const userRequestedDate = answers?.date || answers?.Date || answers?.when || answers?.When || null;
    const dateInstruction = userRequestedDate 
      ? `\n\n🚨 CRITICAL: The user specifically requested activities for: "${userRequestedDate}"\nYou MUST calculate the exact date from this request and use it (or dates very close to it) for ALL recommendations.\nDO NOT default to tomorrow or next week unless the user's request indicates that.\nParse "${userRequestedDate}" carefully and calculate the exact ISO date (YYYY-MM-DD) from today (${todayStr}).\n`
      : `\n\nThe user did not specify a date, so you can suggest activities for any upcoming date.\n`;
    
    const systemPrompt = `You are a family activity recommendation assistant for Latvia. Based on the user's interests and answers to planning questions, recommend 5-10 activities for a SINGLE DAY itinerary from FOUR SOURCES:

1. PROVIDED DATABASE: Activities from our curated database (prioritize these when available)
2. BILESU SERVISS API: Live events and concerts from Latvia's ticket service (includes concerts, shows, and cultural events)
3. YOUR KNOWLEDGE: Activities you know about in Latvia, Riga, Jurmala, Sigulda, and other Latvian cities
4. WEB SEARCH: Use your knowledge to suggest real, existing places and activities in Latvia

RULES:
1. Recommend between 5-10 total activities combining all four sources
2. Prioritize activities from the provided database and Bilesu Serviss when they match user preferences
3. Supplement with 2-4 activities from your knowledge of Latvia when database activities don't cover all interests
4. Focus on creating a ONE-DAY itinerary (activities should fit within a single day)
5. Consider all user preferences: location in Latvia, budget in EUR, group size, interests
6. Ensure activities can be completed in one day with reasonable travel time between them
7. Consider practical factors like timing, location proximity, and logical sequencing for a day trip
8. For activities from your knowledge: provide accurate, real locations with actual addresses in Latvia

CRITICAL DATE FORMAT REQUIREMENT:
- TODAY IS: ${todayStr} (${dayName})${dateInstruction}
- The "date" field MUST be in ISO format: YYYY-MM-DD (e.g., "2025-12-07")
- Date calculation rules:
  * "next Saturday" = the Saturday of NEXT week (7 days from the upcoming Saturday, NOT the closest Saturday)
  * "this Saturday" = the closest upcoming Saturday (could be today if today is Saturday)
  * "next week" = 7 days from today
  * "tomorrow" = ${todayStr} + 1 day
  * Always add 7 days when the user says "next [day]" to ensure it's truly the next occurrence
  * For specific dates like "December 15" or "March 20", calculate from the current year (2025)
  * For "this weekend", use the upcoming Saturday/Sunday
  * For "next month", use dates in the following month
- Never return natural language dates like "Next Saturday" or "This weekend"
- Always calculate the exact date from today (${todayStr})
- RESPECT THE USER'S DATE REQUEST - do not default to tomorrow unless that's what they asked for

EXAMPLES:
- If today is Saturday 2025-11-29 and user says "next Saturday", return: "2025-12-06"
- If today is Friday 2025-11-29 and user says "this Saturday", return: "2025-11-30"
- If today is Friday 2025-11-29 and user says "next Saturday", return: "2025-12-07"

Return ONLY valid JSON in this exact format:
{
  "recommendations": [
    {
      "id": "activity_id_from_database OR unique_id_you_create",
      "title": "Activity Title",
      "description": "Why this matches their preferences",
      "location": "Full address in Latvia",
      "lat": 56.9496,
      "lon": 24.1052,
      "date": "YYYY-MM-DD",
      "time": "Suggested time",
      "price": "Price information or estimate",
      "image": "Image URL from database OR null if suggesting from your knowledge",
      "matchReason": "Brief explanation of why this is a good match"
    }
  ]
}

IMPORTANT: 
- For database activities: Use actual data, include original ID, image URL, and coordinates (lat/lon)
- For activities from your knowledge: Create a unique ID (e.g., "claude-museum-xyz"), set image to null, provide real addresses in Latvia AND accurate coordinates
- COORDINATES ARE MANDATORY: Every activity must include lat (latitude) and lon (longitude) as decimal numbers
- Use accurate GPS coordinates for all locations in Latvia (Riga center is approximately 56.9496, 24.1052)
- Mix database and knowledge-based suggestions to create the best itinerary
- Adapt dates/times based on user preferences
- The date field must ALWAYS be in ISO format (YYYY-MM-DD)
- All locations must be real, existing places in Latvia with accurate coordinates
- Return ONLY the JSON object, no additional text or markdown.`;

    const userPrompt = `User Interests: "${interests || 'Not specified'}"

User Answers to Planning Questions:
${answers ? Object.entries(answers).map(([q, a]) => `${q}: ${a}`).join('\n') : 'No specific answers provided'}

${userRequestedDate ? `\n🚨🚨🚨 IMPORTANT DATE REQUEST 🚨🚨🚨\nThe user wants activities for: "${userRequestedDate}"\nYou MUST parse this date request and use the calculated date for your recommendations.\nDo NOT ignore this and default to tomorrow or any other date.\n` : ''}

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
