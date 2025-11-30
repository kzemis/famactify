-- Recreate the view with SECURITY INVOKER to avoid security definer issues
DROP VIEW IF EXISTS public.shared_trips_view;

CREATE OR REPLACE VIEW public.shared_trips_view 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  events,
  total_cost,
  total_events,
  share_token,
  created_at,
  updated_at
FROM public.saved_trips
WHERE share_token IS NOT NULL;