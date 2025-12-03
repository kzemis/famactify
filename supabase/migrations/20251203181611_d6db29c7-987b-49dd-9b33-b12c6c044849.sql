-- Create table for AI-generated activity spots (for manual review)
CREATE TABLE public.activityspots_genai (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    activity_type text[] NOT NULL DEFAULT '{}',
    age_buckets text[] NOT NULL DEFAULT '{}',
    min_price double precision,
    max_price double precision,
    location_address text,
    location_lat double precision,
    location_lon double precision,
    location_environment text,
    imageurlthumb text,
    urlmoreinfo text,
    source text DEFAULT 'genAI',
    json jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activityspots_genai ENABLE ROW LEVEL SECURITY;

-- Allow system to insert (via service role from edge function)
CREATE POLICY "Service role can insert genAI activities"
ON public.activityspots_genai
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view (for admin review)
CREATE POLICY "Authenticated users can view genAI activities"
ON public.activityspots_genai
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_activityspots_genai_updated_at
BEFORE UPDATE ON public.activityspots_genai
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();