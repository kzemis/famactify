-- FamActify activityspots import preflight — safe/idempotent.
-- Run this before import SQL if you are not 100% sure every migration has been applied.
-- It does not change existing data; it only ensures columns used by the import exist.

ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS source text DEFAULT 'user';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS primary_category text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS subtype text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS involvement text DEFAULT 'active_together';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS age_min smallint;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS age_max smallint;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS duration_max_minutes int;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS booking_required boolean DEFAULT false;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS season text[] DEFAULT '{year-round}';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS rain_suitable boolean DEFAULT true;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS highlights text[] DEFAULT '{}';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS excitement_score smallint DEFAULT 3;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'LV';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS sensory_friendly boolean DEFAULT NULL;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS transit_accessible boolean DEFAULT NULL;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS fenced boolean DEFAULT NULL;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS source_confidence smallint DEFAULT NULL;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS family_fit_score smallint DEFAULT NULL;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS ticket_url text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS organizer text;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS created_by text DEFAULT 'user';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS created_by_reference jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS urlmoreinfo_status text DEFAULT 'unknown';
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS urlmoreinfo_checked_at timestamptz;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS urlmoreinfo_http_status int;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS urlmoreinfo_final_url text;

CREATE INDEX IF NOT EXISTS idx_activityspots_country_code ON public.activityspots(country_code);
CREATE INDEX IF NOT EXISTS idx_activityspots_country_city ON public.activityspots(country_code, city);
CREATE INDEX IF NOT EXISTS idx_activityspots_event_starttime ON public.activityspots(event_starttime) WHERE event_starttime IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activityspots_created_by ON public.activityspots(created_by);
CREATE INDEX IF NOT EXISTS idx_activityspots_urlmoreinfo_status ON public.activityspots(urlmoreinfo_status) WHERE urlmoreinfo IS NOT NULL;
