-- Create table to track trip confirmations
CREATE TABLE public.trip_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.saved_trips(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trip_id, recipient_email)
);

-- Enable RLS
ALTER TABLE public.trip_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to confirm (public endpoint will handle this)
CREATE POLICY "Anyone can confirm attendance"
ON public.trip_confirmations
FOR UPDATE
USING (true);

-- Users can view confirmations for their own trips
CREATE POLICY "Users can view confirmations for their trips"
ON public.trip_confirmations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.saved_trips
    WHERE saved_trips.id = trip_confirmations.trip_id
    AND saved_trips.user_id = auth.uid()
  )
);

-- System can insert confirmation records (via edge function)
CREATE POLICY "System can insert confirmations"
ON public.trip_confirmations
FOR INSERT
WITH CHECK (true);