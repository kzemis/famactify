-- Add recipients column to saved_trips table
ALTER TABLE public.saved_trips 
ADD COLUMN recipients text[] DEFAULT '{}';

COMMENT ON COLUMN public.saved_trips.recipients IS 'Email addresses of family members who received calendar invitations';