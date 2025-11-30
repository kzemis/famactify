-- Drop the public share token policy since we'll use a view instead
DROP POLICY IF EXISTS "Anyone can view trips with share token" ON public.saved_trips;

-- Create a secure view for shared trips that excludes sensitive fields
CREATE OR REPLACE VIEW public.shared_trips_view AS
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

-- Grant SELECT access on the view to anonymous users
GRANT SELECT ON public.shared_trips_view TO anon;
GRANT SELECT ON public.shared_trips_view TO authenticated;