-- SCV-01 — multilingual stop copy
-- Adds optional Latvian clue/reveal text while preserving English as fallback.

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS clue_text_lv TEXT,
  ADD COLUMN IF NOT EXISTS reveal_fun_fact_lv TEXT;

COMMENT ON COLUMN public.hunt_stops.clue_text_lv IS
  'Optional Latvian translation of clue_text. If null, client falls back to clue_text.';

COMMENT ON COLUMN public.hunt_stops.reveal_fun_fact_lv IS
  'Optional Latvian translation of reveal_fun_fact. If null, client falls back to reveal_fun_fact.';
