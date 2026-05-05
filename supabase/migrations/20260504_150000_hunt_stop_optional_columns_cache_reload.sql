-- SCV-01 — repair optional hunt_stop columns and force PostgREST schema cache reload.
-- Run this if the app still says "Could not find the 'clue_text_lv' column"
-- after running the multilingual-stop migration.

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS clue_text_lv TEXT,
  ADD COLUMN IF NOT EXISTS reveal_fun_fact_lv TEXT,
  ADD COLUMN IF NOT EXISTS prompt_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.hunt_stops.clue_text_lv IS
  'Optional Latvian translation of clue_text. If null, client falls back to clue_text.';

COMMENT ON COLUMN public.hunt_stops.reveal_fun_fact_lv IS
  'Optional Latvian translation of reveal_fun_fact. If null, client falls back to reveal_fun_fact.';

COMMENT ON COLUMN public.hunt_stops.prompt_metadata IS
  'Prompt-specific optional fields such as audioSubject, drawingSubject, timeTravelImageUrl, timeTravelCaption, timeTravelOpacity.';

NOTIFY pgrst, 'reload schema';
