-- SCV-01 — Prompt diversity pass for existing scavenger hunts.
-- Adds/updates at least one audio, drawing, observation/grounding, question,
-- and source-backed timeline prompt across the current hunt catalog where
-- applicable. Timeline prompts are only added when a real source image exists.

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS prompt_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

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

-- ── Riga: Albert Street already has the source-backed timeline prompt ───────

UPDATE public.hunt_stops s
SET prompt_kind = 'observation',
    prompt_question = 'Find one sign, word, or number on Alberta iela that proves you are really standing on this street.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = '{}'::jsonb
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-albert-street-time-travel'
  AND s.stop_order = 1;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of quiet Alberta iela ambience or your own voice saying “Art Nouveau”.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Quiet Alberta iela ambience or the words Art Nouveau',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-albert-street-time-travel'
  AND s.stop_order = 4;

-- ── Riga Old Town ───────────────────────────────────────────────────────────

UPDATE public.hunt_stops s
SET prompt_kind = 'observation',
    prompt_question = 'Walk through the gate and notice one old-wall detail: stone, arch, shadow, narrowness, or sound.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = '{}'::jsonb
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-old-town-weekend'
  AND s.stop_order = 1;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of a safe Dome Square sound: bells if you hear them, footsteps, wind, or your own quiet “Doma baznīca”.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Dome Square ambience, bells if present, footsteps, wind, or player voice',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-old-town-weekend'
  AND s.stop_order = 3;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw one dramatic façade detail: clock, statue, curve, window, or decoration.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A House of the Blackheads façade detail'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-old-town-weekend'
  AND s.stop_order = 4;

-- ── Riga Zoo ────────────────────────────────────────────────────────────────

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw one indoor animal home shape: tank, terrarium, branch, rock, water, or warm lamp.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'An indoor animal home shape from the zoo'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-zoo-weekend'
  AND s.stop_order = 3;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of one animal-area sound or your own quiet imitation of the movement you saw.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Animal-area ambience or the child imitating an animal movement sound',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-zoo-weekend'
  AND s.stop_order = 4;

-- ── Riga neighbourhood batch from Sigita ideas ──────────────────────────────

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of market life: voices, footsteps, coffee sounds, bags, or your own “tirgus” word.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Market ambience or the word tirgus spoken by the player',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-agenskalns-green-loop'
  AND s.stop_order = 1;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw a bridge, path curve, water feature, or waterfall-sound shape you noticed.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'An Arkādijas bridge, path curve, water feature, or waterfall-sound shape'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-agenskalns-green-loop'
  AND s.stop_order = 3;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of playground sound: shoes, swing, laughter nearby, wind, or your own “ready, set, go!”',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'A safe playground sound or the player saying ready, set, go',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-barona-playground'
  AND s.stop_order = 1;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw one playground texture or movement path: slide, climb, rope, shadow, sand, or hop line.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A playground texture or movement path without faces'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-barona-playground'
  AND s.stop_order = 3;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of a quiet “choir” sound: hum, clap, footsteps, wind, or your own note.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'A hum, clap, wind, footsteps, or one sung note near/imagining the bandstand',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-mezaparks-forest'
  AND s.stop_order = 2;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw your forest movement or one path shape you followed.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A forest path, movement trail, leaf, cone, or quiet-listening shape'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-mezaparks-forest'
  AND s.stop_order = 3;

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of movement sound: water, wheels, sand, leaves, footsteps, or your own “flow” sound.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Water, wheels, sand, leaves, footsteps, or a pretend flow sound',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-uzvaras-park'
  AND s.stop_order = 1;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw one natural texture you found: bark, stone, grass, sand, leaf, or wood.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A natural texture from Uzvaras Park'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'riga-uzvaras-park'
  AND s.stop_order = 2;

-- ── ZK Latvian School 75 ───────────────────────────────────────────────────

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of yourself saying “Ziemeļkalifornijas Latviešu skola” — or just “skola” if that is easier.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'The player saying Ziemeļkalifornijas Latviešu skola or skola',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'zkl-latvian-school-75'
  AND s.stop_order = 2;

UPDATE public.hunt_stops s
SET prompt_kind = 'drawing',
    prompt_question = 'Draw one Latvian pattern, green-white detail, or decoration you noticed.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A Latvian pattern or event decoration detail'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'zkl-latvian-school-75'
  AND s.stop_order = 5;

-- ── Bay Area static seed copies, if a DB copy exists ────────────────────────

WITH hunt AS (
  SELECT id FROM public.hunts WHERE slug = 'berkeley-kids-eyes'
)
UPDATE public.hunt_stops s
SET stop_order = CASE
      WHEN title = 'Cesar Chavez Park — Kite Hill' THEN 102
      WHEN title = 'Hearst Greek Theatre' THEN 103
      ELSE stop_order
    END
FROM hunt
WHERE s.hunt_id = hunt.id
  AND s.title IN ('Cesar Chavez Park — Kite Hill', 'Hearst Greek Theatre');

INSERT INTO public.hunt_stops (
  hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
  prompt_kind, prompt_question, prompt_options, prompt_correct,
  prompt_photo_subject, prompt_metadata, reveal_fun_fact
)
SELECT
  h.id,
  2,
  'Rose Garden Senses Check',
  37.8845,
  -122.2625,
  '1200 Euclid Avenue, Berkeley, CA 94708',
  'Before leaving the rose terraces, pause for a tiny grounding mission: one colour, one smell, one sound, and one safe texture you can touch.',
  'This stop is intentionally slow. Let the child point, sniff, listen, and touch a leaf/bench/stone safely without picking flowers.',
  'observation',
  'Notice one colour, one smell, one sound, and one safe texture.',
  NULL,
  NULL,
  NULL,
  '{}'::jsonb,
  'A senses check turns a place into a memory: the brain stores smell, sound, colour, and touch together much more strongly than a name alone.'
FROM public.hunts h
WHERE h.slug = 'berkeley-kids-eyes'
  AND NOT EXISTS (
    SELECT 1 FROM public.hunt_stops s
    WHERE s.hunt_id = h.id
      AND s.title = 'Rose Garden Senses Check'
  );

WITH hunt AS (
  SELECT id FROM public.hunts WHERE slug = 'berkeley-kids-eyes'
)
UPDATE public.hunt_stops s
SET stop_order = CASE
      WHEN title = 'Cesar Chavez Park — Kite Hill' THEN 3
      WHEN title = 'Hearst Greek Theatre' THEN 4
      ELSE stop_order
    END
FROM hunt
WHERE s.hunt_id = hunt.id
  AND s.title IN ('Cesar Chavez Park — Kite Hill', 'Hearst Greek Theatre');

WITH hunt AS (
  SELECT id FROM public.hunts WHERE slug = 'oakland-black-panther-heritage'
)
UPDATE public.hunt_stops s
SET stop_order = 104
FROM hunt
WHERE s.hunt_id = hunt.id
  AND s.title = 'Lake Merritt — community wrap-up';

UPDATE public.hunt_stops s
SET prompt_kind = 'audio',
    prompt_question = 'Step aside safely and record 5 seconds of yourself saying “Free Breakfast for Children” or one welcoming breakfast sound.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'The player saying Free Breakfast for Children, or a welcoming breakfast sound',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'oakland-black-panther-heritage'
  AND s.title = 'St. Augustine''s Episcopal Church — Free Breakfast birthplace';

INSERT INTO public.hunt_stops (
  hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
  prompt_kind, prompt_question, prompt_options, prompt_correct,
  prompt_photo_subject, prompt_metadata, reveal_fun_fact
)
SELECT
  h.id,
  3,
  'Lake Merritt Community Grounding',
  37.8044,
  -122.2595,
  '666 Bellevue Avenue, Oakland, CA 94610',
  'At Lake Merritt, sit or stand safely and look for two community clues: people sharing space, birds using the water, a path, a bench, a sign, or a meeting place.',
  'This is a calm observation stop. The point is to connect “community programs” with a real public space where many people belong.',
  'observation',
  'Notice two clues that show this lake is a community place.',
  NULL,
  NULL,
  NULL,
  '{}'::jsonb,
  'Lake Merritt is a tidal lagoon connected to San Francisco Bay — and the first official wildlife refuge in the United States, declared in 1870. It has long been a public gathering place.'
FROM public.hunts h
WHERE h.slug = 'oakland-black-panther-heritage'
  AND NOT EXISTS (
    SELECT 1 FROM public.hunt_stops s
    WHERE s.hunt_id = h.id
      AND s.title = 'Lake Merritt Community Grounding'
  );

UPDATE public.hunt_stops s
SET stop_order = 4,
    prompt_kind = 'drawing',
    prompt_question = 'Draw one community program you would start for kids today.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A kid-friendly community program idea inspired by the Panthers'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'oakland-black-panther-heritage'
  AND s.title = 'Lake Merritt — community wrap-up';

WITH hunt AS (
  SELECT id FROM public.hunts WHERE slug = 'richmond-rosie-the-riveter'
)
UPDATE public.hunt_stops s
SET stop_order = CASE
      WHEN title = 'SS Red Oak Victory ship' THEN 101
      WHEN title = 'Rosie the Riveter Memorial' THEN 102
      WHEN title = 'Strike a Rosie pose' THEN 103
      ELSE stop_order
    END
FROM hunt
WHERE s.hunt_id = hunt.id
  AND s.title IN ('SS Red Oak Victory ship', 'Rosie the Riveter Memorial', 'Strike a Rosie pose');

INSERT INTO public.hunt_stops (
  hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
  prompt_kind, prompt_question, prompt_options, prompt_correct,
  prompt_photo_subject, prompt_metadata, reveal_fun_fact
)
SELECT
  h.id,
  1,
  'Home Front Grounding',
  37.9032,
  -122.3659,
  '1414 Harbour Way South #3000, Richmond, CA 94804',
  'Before heading to the ship, find three home-front clues: a worker photo, tool, poster, shipyard map, timeline, or everyday object.',
  'This is a grounding stop inside/near the visitor centre. Ask: what shows that real people worked here, not just “history” in a book?',
  'observation',
  'Notice three clues that show real wartime workers and families were here.',
  NULL,
  NULL,
  NULL,
  '{}'::jsonb,
  'The Richmond Home Front story is about ordinary people doing extraordinary work: building ships, running childcare, moving to new jobs, and changing what work looked like for women and families.'
FROM public.hunts h
WHERE h.slug = 'richmond-rosie-the-riveter'
  AND NOT EXISTS (
    SELECT 1 FROM public.hunt_stops s
    WHERE s.hunt_id = h.id
      AND s.title = 'Home Front Grounding'
  );

UPDATE public.hunt_stops s
SET stop_order = 2,
    prompt_kind = 'audio',
    prompt_question = 'Record 5 seconds of harbour/shipyard sound — wind, water, footsteps, or your own “clang clang” shipbuilding sound.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'audioSubject', 'Harbour, wind, water, footsteps, or a pretend shipbuilding clang',
      'audioMaxSeconds', 5
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'richmond-rosie-the-riveter'
  AND s.title = 'SS Red Oak Victory ship';

UPDATE public.hunt_stops s
SET stop_order = 3,
    prompt_kind = 'drawing',
    prompt_question = 'Draw the outline of a Liberty ship or one timeline shape you notice at the memorial.',
    prompt_options = NULL,
    prompt_correct = NULL,
    prompt_photo_subject = NULL,
    prompt_metadata = jsonb_build_object(
      'drawingSubject', 'A Liberty ship outline, rivet, timeline mark, or memorial shape'
    )
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'richmond-rosie-the-riveter'
  AND s.title = 'Rosie the Riveter Memorial';

UPDATE public.hunt_stops s
SET stop_order = 4
FROM public.hunts h
WHERE s.hunt_id = h.id
  AND h.slug = 'richmond-rosie-the-riveter'
  AND s.title = 'Strike a Rosie pose';
