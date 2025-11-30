-- Update RLS policy to require authentication for contributing activity spots
DROP POLICY IF EXISTS "Anyone can contribute activity spots" ON public.activityspots;

CREATE POLICY "Authenticated users can contribute activity spots" 
ON public.activityspots 
FOR INSERT 
TO authenticated
WITH CHECK (true);

COMMENT ON POLICY "Authenticated users can contribute activity spots" ON public.activityspots 
IS 'Only logged-in users can submit new activity spots';