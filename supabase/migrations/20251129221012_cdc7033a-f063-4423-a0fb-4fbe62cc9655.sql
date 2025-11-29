-- Allow anyone to contribute activity spots (for MVP testing phase)
-- This replaces the authenticated-only policy with a public one
DROP POLICY IF EXISTS "Authenticated users can insert activity spots" ON public.activityspots;

CREATE POLICY "Anyone can contribute activity spots"
ON public.activityspots
FOR INSERT
TO public
WITH CHECK (true);