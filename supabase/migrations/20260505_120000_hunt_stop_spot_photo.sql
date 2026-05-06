-- ============================================================
-- SCV-01 — Add 'spot_photo' prompt kind
-- Admin uploads a reference photo; kid finds & optionally photographs it.
-- Paste this block into the Supabase SQL Editor and run.
-- ============================================================

-- 1. Add reference image column for spot_photo prompts
ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS prompt_reference_image TEXT;

-- 2. Widen prompt_kind CHECK to include 'spot_photo'
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.hunt_stops'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%prompt_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hunt_stops DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.hunt_stops
  ADD CONSTRAINT hunt_stops_prompt_kind_check
  CHECK (prompt_kind IN (
    'text', 'multiple_choice', 'photo', 'observation',
    'audio', 'drawing', 'time_travel_photo', 'spot_photo'
  ));

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
