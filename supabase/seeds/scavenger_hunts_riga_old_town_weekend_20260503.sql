-- ============================================================
-- SCV-01 seed — Riga Old Town Weekend Scavenger Game
-- Run after:
--   supabase/migrations/20260502_200000_scavenger_hunts.sql
--   supabase/migrations/20260502_210000_admin_and_hunt_extras.sql
-- ============================================================

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS parent_hint TEXT;

DO $$
DECLARE
  v_hunt_id UUID;
BEGIN
  SELECT id INTO v_hunt_id
  FROM public.hunts
  WHERE slug = 'riga-old-town-weekend';

  IF v_hunt_id IS NULL THEN
    INSERT INTO public.hunts (
      slug, title, blurb, cover_emoji, host_name, city, country_code,
      primary_theme, age_min, age_max, duration_minutes, difficulty,
      est_cost_cents, distance_meters, credits, status, published_at
    ) VALUES (
      'riga-old-town-weekend',
      'Riga Old Town Weekend Scavenger Game',
      'A walkable Old Riga game with clues, landmark facts, and privacy-safe challenges for this weekend.',
      '🏰',
      'FamActify Original',
      'Rīga',
      'LV',
      'history',
      6,
      14,
      90,
      'easy',
      0,
      1400,
      'Source facts: LiveRiga pages for the Freedom Monument, Swedish Gate, Three Brothers, and House of the Blackheads; Latvia Travel page for Riga Cathedral. Links: https://www.liveriga.com/en/visit/what-to-see/sightseeing/the-freedom-monument ; https://www.liveriga.com/en/1595-swedish-gate ; https://www.liveriga.com/en/visit/what-to-see/sightseeing/three-brothers ; https://www.latvia.travel/en/sight/riga-cathedral ; https://www.liveriga.com/en/visit/what-to-see/sightseeing/house-of-the-blackheads',
      'published',
      '2026-05-03T00:00:00Z'
    )
    RETURNING id INTO v_hunt_id;
  ELSE
    UPDATE public.hunts
    SET
      title = 'Riga Old Town Weekend Scavenger Game',
      blurb = 'A walkable Old Riga game with clues, landmark facts, and privacy-safe challenges for this weekend.',
      cover_emoji = '🏰',
      host_name = 'FamActify Original',
      city = 'Rīga',
      country_code = 'LV',
      primary_theme = 'history',
      age_min = 6,
      age_max = 14,
      duration_minutes = 90,
      difficulty = 'easy',
      est_cost_cents = 0,
      distance_meters = 1400,
      credits = 'Source facts: LiveRiga pages for the Freedom Monument, Swedish Gate, Three Brothers, and House of the Blackheads; Latvia Travel page for Riga Cathedral. Links: https://www.liveriga.com/en/visit/what-to-see/sightseeing/the-freedom-monument ; https://www.liveriga.com/en/1595-swedish-gate ; https://www.liveriga.com/en/visit/what-to-see/sightseeing/three-brothers ; https://www.latvia.travel/en/sight/riga-cathedral ; https://www.liveriga.com/en/visit/what-to-see/sightseeing/house-of-the-blackheads',
      status = 'published',
      published_at = COALESCE(published_at, '2026-05-03T00:00:00Z')
    WHERE id = v_hunt_id;
  END IF;

  DELETE FROM public.hunt_stops WHERE hunt_id = v_hunt_id;
  DELETE FROM public.hunt_sponsors WHERE hunt_id = v_hunt_id;

  INSERT INTO public.hunt_sponsors (hunt_id, name, url, sort_order)
  VALUES (v_hunt_id, 'FamActify', 'https://famactify.com', 0);

  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject,
    reveal_fun_fact
  ) VALUES
  (
    v_hunt_id, 0, 'Freedom Monument: Three Stars', 56.95147, 24.11326, 'Brīvības piemineklis, Central District, Rīga',
    'Start at the tall monument where a woman holds three stars above Riga. Stand where you can see the whole monument safely.',
    'Look for the copper figure at the very top. The answer is visible from the square without crossing traffic.',
    'multiple_choice',
    'What does the figure at the top of the Freedom Monument hold?',
    '["Three stars","A book","A ship","A cat"]'::jsonb,
    '["Three stars"]'::jsonb,
    NULL,
    'LiveRiga describes the Freedom Monument as a 42.7-metre landmark unveiled on November 18, 1935, honouring soldiers killed during the Latvian War of Independence.'
  ),
  (
    v_hunt_id, 1, 'Swedish Gate: Old Wall Detective', 56.95127, 24.10775, 'Zviedru vārti, Torņa iela, Rīga',
    'Find the stone arch that leads through the old city wall. Walk through it and notice how narrow the passage feels.',
    'Head toward Torņa iela. This stop is the Swedish Gate, also called Zviedru vārti.',
    'photo',
    'Take a privacy-safe photo of the gate or stone arch — no people’s faces.',
    NULL,
    NULL,
    'Swedish Gate stone arch without faces',
    'LiveRiga says the Swedish Gate is the only gate still standing from the former eight gates of Riga’s fortification walls.'
  ),
  (
    v_hunt_id, 2, 'Three Brothers: Which One Is Oldest?', 56.95037, 24.10492, 'Mazā Pils iela 17, 19, 21, Rīga',
    'Find three neighbouring historic houses on Mazā Pils iela. They are known together as the Three Brothers.',
    'The oldest brother is the house at Mazā Pils iela 17. Let kids compare the façades before answering.',
    'multiple_choice',
    'Which address is the oldest of the Three Brothers?',
    '["Mazā Pils iela 17","Mazā Pils iela 19","Mazā Pils iela 21","Doma laukums 1"]'::jsonb,
    '["Mazā Pils iela 17"]'::jsonb,
    NULL,
    'LiveRiga calls the Three Brothers the oldest residential complex in Riga. The oldest house, at 17 Mazā Pils Street, dates to the 15th century.'
  ),
  (
    v_hunt_id, 3, 'Riga Cathedral: Stone-By-Stone', 56.94917, 24.10448, 'Doma laukums 1, Rīga',
    'Walk to the big cathedral on Dome Square. Find a safe spot where you can see the tower and old brick walls.',
    'This is Riga Cathedral, also called the Dome Cathedral. The date clue is 1211.',
    'multiple_choice',
    'According to Latvia Travel, when was the cornerstone of Riga Cathedral laid?',
    '["1211","1334","1646","1935"]'::jsonb,
    '["1211"]'::jsonb,
    NULL,
    'Latvia Travel says the cornerstone of Riga Cathedral was laid in 1211, making it one of the oldest sacred buildings of the Middle Ages in Latvia and the Baltics.'
  ),
  (
    v_hunt_id, 4, 'House of the Blackheads: Celebration House', 56.94752, 24.10691, 'Rātslaukums 7, Rīga',
    'Finish at the ornate building on Town Hall Square. Look for decorations, figures, and the big historic façade.',
    'The source-backed date answer is 1334. Invite kids to find the most dramatic decoration on the façade too.',
    'text',
    'What year was the House of the Blackheads built?',
    NULL,
    '["1334"]'::jsonb,
    NULL,
    'LiveRiga says the House of the Blackheads was built in 1334 as a meeting and celebration venue, and that the Brotherhood of Black Heads used it for nearly 400 years.'
  );
END $$;
