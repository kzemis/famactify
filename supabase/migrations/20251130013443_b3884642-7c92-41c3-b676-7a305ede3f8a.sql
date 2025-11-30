-- Add share_token column to saved_trips for public sharing
ALTER TABLE public.saved_trips
ADD COLUMN share_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Create index for faster lookups
CREATE INDEX idx_saved_trips_share_token ON public.saved_trips(share_token);

-- Allow anyone to view shared trips via token
CREATE POLICY "Anyone can view trips with share token"
ON public.saved_trips
FOR SELECT
USING (share_token IS NOT NULL);