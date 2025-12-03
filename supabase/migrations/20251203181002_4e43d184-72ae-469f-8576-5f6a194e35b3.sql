-- Add source column to track activity origin
ALTER TABLE public.activityspots 
ADD COLUMN source text DEFAULT 'user';

-- Add comment for documentation
COMMENT ON COLUMN public.activityspots.source IS 'Source of the activity: user (authenticated), anonymous (unauthenticated), genAI (AI-generated)';