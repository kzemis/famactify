-- SCV-01 — media prompt metadata + time-travel photo overlay prompt
-- Adds a small JSONB metadata home for prompt-specific fields that should not
-- become permanent columns every time a new prompt modality is introduced.

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS prompt_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Widen prompt kind CHECK constraint for audio, drawing, and time-travel photo.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.hunt_stops'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%prompt_kind%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.hunt_stops DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.hunt_stops
  ADD CONSTRAINT hunt_stops_prompt_kind_check
  CHECK (prompt_kind IN (
    'text',
    'multiple_choice',
    'photo',
    'observation',
    'audio',
    'drawing',
    'time_travel_photo'
  ));

COMMENT ON COLUMN public.hunt_stops.prompt_metadata IS
  'Prompt-specific optional fields such as audioSubject, drawingSubject, timeTravelImageUrl, timeTravelCaption, timeTravelOpacity.';
