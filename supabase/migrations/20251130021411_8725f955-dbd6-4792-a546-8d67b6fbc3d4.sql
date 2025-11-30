-- Add discoverable field to profiles table
ALTER TABLE public.profiles ADD COLUMN discoverable boolean DEFAULT false;

-- Update RLS policy to allow viewing discoverable profiles
CREATE POLICY "Users can view discoverable profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (discoverable = true);