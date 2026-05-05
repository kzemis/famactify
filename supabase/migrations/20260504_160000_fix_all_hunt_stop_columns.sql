-- ============================================================
-- SCV-01 — Fix hunt_stops columns (Part 1 of 2)
-- Paste ONLY this block into the Supabase SQL Editor and run it.
-- Then paste Part 2 below separately.
-- ============================================================

-- 1. All optional hunt_stops columns in one ALTER
ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS clue_text_lv TEXT,
  ADD COLUMN IF NOT EXISTS reveal_fun_fact_lv TEXT,
  ADD COLUMN IF NOT EXISTS prompt_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_hint TEXT;

-- 2. Widen prompt_kind CHECK
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
    'audio', 'drawing', 'time_travel_photo'
  ));

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
