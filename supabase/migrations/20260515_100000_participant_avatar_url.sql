-- MP-T1: Add avatar_url column to hunt_race_participants
-- Additive-only migration. family_name + family_emoji already exist.
-- avatar_url stores a Supabase Storage public URL when a player uploads a photo.
-- When null, the UI falls back to family_emoji.

ALTER TABLE public.hunt_race_participants
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
