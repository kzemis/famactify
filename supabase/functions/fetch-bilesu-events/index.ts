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
    // Private Bilesu Serviss API endpoint (not exposed publicly)
    const BILESU_SERVISS_API_URL = 'https://www.bilesuserviss.lv/api/action/filter/?types=category,concert,promoter,venue,price&export=category&order=title,desc&fields=category/decoratedTitle,hidden,id,image,link,parentCategoryId,shortImageUrl,title;concert/ageRestriction,badgeData,buyButtonConfig,centerId,country,customDate,customTargetUrl,decoratedTitle,description,descriptionLanguages,descriptionPlain,discount,endTime,eventPlace,feeRange,festivalTitle,id,image,imageUrl,link,localisedEndDate,localisedStartDate,maxAdditionalFee,maxPrice,maxServiceFee,minAdditionalFee,minPrice,minServiceFee,modifiedTimeStamp,originalImageUrl,prices,promoterId,purchaseDescription,rank,salesStatus,salesTime,serviceFeeRange,shopAppUrl,shopUrl,shortImageUrl,shortUrl,showId,specialStatus,startTime,subMode,systemId,templateShort,title,topPosition,trackingUrl,url,venueDecoratedTitle,venueDescription,venueId,venueTitle,video,videoUrl;promoter/address,decoratedTitle,email,externalUrl,id,link,modifiedTimeStamp,originalImageUrl,phone,shortImageUrl,title,url;venue/address,city,coordinates,countryId,county,decoratedTitle,externalUrl,id,image,link,location_country,logoImageUrl,map,modifiedTimeStamp,originalImageUrl,region,title,url&filter=categoryId/1004,1034,1041,1138,1396,1021,1224;concertActive&limit=2000000&start=0&language=eng';
    
    console.log('Fetching events from Bilesu Serviss API');
    
    const response = await fetch(BILESU_SERVISS_API_URL);
    
    if (!response.ok) {
      throw new Error(`Bilesu Serviss API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the data to a more manageable format
    let events = [];
    if (data && data.concerts && Array.isArray(data.concerts)) {
      events = data.concerts.map((concert: any) => ({
        id: concert.id,
        title: concert.title || concert.decoratedTitle,
        description: concert.descriptionPlain || concert.description || '',
        venue: concert.venueTitle || concert.eventPlace || '',
        startTime: concert.startTime,
        endTime: concert.endTime,
        startDate: concert.localisedStartDate,
        endDate: concert.localisedEndDate,
        minPrice: concert.minPrice,
        maxPrice: concert.maxPrice,
        image: concert.shortImageUrl || concert.imageUrl || concert.originalImageUrl,
        url: concert.url || concert.shopUrl,
        ageRestriction: concert.ageRestriction,
        salesStatus: concert.salesStatus,
        category: concert.festivalTitle || '',
      }));
    }
    
    console.log(`Fetched ${events.length} events from Bilesu Serviss API`);
    
    return new Response(
      JSON.stringify({ events }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error fetching Bilesu Serviss events:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch events', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
