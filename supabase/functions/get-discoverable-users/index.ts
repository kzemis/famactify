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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration is missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch profiles marked as discoverable
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('full_name, user_id, city')
      .eq('discoverable', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Fetch user emails using service role
    const usersWithEmails = await Promise.all(
      (profiles || []).map(async (profile) => {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (userError) {
          console.error(`Error fetching user ${profile.user_id}:`, userError);
          return null;
        }
        
        return {
          full_name: profile.full_name,
          city: profile.city,
          email: user?.email || '',
          user_id: profile.user_id,
        };
      })
    );

    // Filter out null values and users without emails
    const validUsers = usersWithEmails.filter(u => u && u.email);

    console.log(`Fetched ${validUsers.length} discoverable users`);

    return new Response(
      JSON.stringify({ users: validUsers }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-discoverable-users function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch discoverable users', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
