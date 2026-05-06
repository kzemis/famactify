-- ============================================================
-- SCV-01 — Add 'voice_answer' prompt kind
-- Kid speaks; speech-to-text matches against correctAnswers.
-- Lowers keyboard barrier for 4-7 year olds.
-- Paste this block into the Supabase SQL Editor and run.
-- ============================================================

-- Widen prompt_kind CHECK to include 'voice_answer'
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
    'audio', 'drawing', 'time_travel_photo', 'spot_photo',
    'voice_answer'
  ));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
