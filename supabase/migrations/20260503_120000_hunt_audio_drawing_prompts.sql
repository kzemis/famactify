-- ============================================================
-- SCV-01 — Allow `audio` and `drawing` prompt kinds for hunt stops.
--
-- Audio + drawing answers are stored inside the JSONB results column on
-- hunt_attempts (no extra column needed). Only the CHECK constraint on the
-- prompt_kind enum needs to be widened.
-- ============================================================

-- Drop the existing constraint (Postgres auto-generated name is preserved as the
-- table-level inline check from the original migration; we drop by name pattern).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname
    INTO cname
    FROM pg_constraint
   WHERE conrelid = 'public.hunt_stops'::regclass
     AND contype  = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%prompt_kind%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hunt_stops DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.hunt_stops
  ADD CONSTRAINT hunt_stops_prompt_kind_check
  CHECK (prompt_kind IN ('text', 'multiple_choice', 'photo', 'observation', 'audio', 'drawing'));
