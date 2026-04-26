ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS ticket_url TEXT;
ALTER TABLE public.activityspots ADD COLUMN IF NOT EXISTS organizer TEXT;
CREATE INDEX IF NOT EXISTS idx_activityspots_event_starttime ON public.activityspots(event_starttime) WHERE event_starttime IS NOT NULL;
