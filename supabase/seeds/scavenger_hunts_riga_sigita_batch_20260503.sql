-- ============================================================
-- SCV-01 seed — Riga neighborhood hunts from Sigita suggestions
-- Run after:
--   supabase/migrations/20260502_200000_scavenger_hunts.sql
--   supabase/migrations/20260502_210000_admin_and_hunt_extras.sql
-- ============================================================

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS parent_hint TEXT;

CREATE OR REPLACE FUNCTION public.seed_scavenger_hunt(
  p_slug TEXT,
  p_title TEXT,
  p_blurb TEXT,
  p_cover_emoji TEXT,
  p_city TEXT,
  p_country_code TEXT,
  p_primary_theme TEXT,
  p_age_min INTEGER,
  p_age_max INTEGER,
  p_duration_minutes INTEGER,
  p_difficulty TEXT,
  p_distance_meters INTEGER,
  p_credits TEXT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_hunt_id UUID;
BEGIN
  SELECT id INTO v_hunt_id FROM public.hunts WHERE slug = p_slug;

  IF v_hunt_id IS NULL THEN
    INSERT INTO public.hunts (
      slug, title, blurb, cover_emoji, host_name, city, country_code,
      primary_theme, age_min, age_max, duration_minutes, difficulty,
      est_cost_cents, distance_meters, credits, status, published_at
    ) VALUES (
      p_slug, p_title, p_blurb, p_cover_emoji, 'FamActify Original', p_city, p_country_code,
      p_primary_theme, p_age_min, p_age_max, p_duration_minutes, p_difficulty,
      0, p_distance_meters, p_credits, 'published', '2026-05-03T00:00:00Z'
    )
    RETURNING id INTO v_hunt_id;
  ELSE
    UPDATE public.hunts
    SET
      title = p_title,
      blurb = p_blurb,
      cover_emoji = p_cover_emoji,
      host_name = 'FamActify Original',
      city = p_city,
      country_code = p_country_code,
      primary_theme = p_primary_theme,
      age_min = p_age_min,
      age_max = p_age_max,
      duration_minutes = p_duration_minutes,
      difficulty = p_difficulty,
      est_cost_cents = 0,
      distance_meters = p_distance_meters,
      credits = p_credits,
      status = 'published',
      published_at = COALESCE(published_at, '2026-05-03T00:00:00Z')
    WHERE id = v_hunt_id;
  END IF;

  DELETE FROM public.hunt_stops WHERE hunt_id = v_hunt_id;
  DELETE FROM public.hunt_sponsors WHERE hunt_id = v_hunt_id;
  INSERT INTO public.hunt_sponsors (hunt_id, name, url, sort_order)
  VALUES (v_hunt_id, 'FamActify', 'https://famactify.com', 0);

  RETURN v_hunt_id;
END $$;

DO $$
DECLARE
  v_hunt_id UUID;
BEGIN
  v_hunt_id := public.seed_scavenger_hunt(
    'riga-uzvaras-park',
    'Uzvaras Park Active Clue Game',
    'A flexible park hunt for the renewed Uzvaras Park landscape: water play, natural materials, movement, and calm observation.',
    '🌳', 'Rīga', 'LV', 'nature', 4, 12, 55, 'easy', 900,
    'Source facts: LiveRiga Uzvaras parks page; Riga City 2025 article about the renewed active/sports zone, water play equipment, natural materials, and 36+ ha total park area.'
  );
  INSERT INTO public.hunt_stops (hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint, prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject, reveal_fun_fact) VALUES
  (v_hunt_id, 0, 'Park Name Detective', 56.9402, 24.0857, 'Uzvaras parks, Pārdaugava, Rīga', 'Start at a park sign, map, or safe path entrance. Find the park name before you begin exploring.', 'LiveRiga describes Uzvaras parks as a broad, landscaped park in Pārdaugava.', 'multiple_choice', 'Which park are you exploring?', '["Uzvaras parks","Vērmanes dārzs","Arkādijas parks","Mežaparks"]'::jsonb, '["Uzvaras parks"]'::jsonb, NULL, 'LiveRiga says Uzvaras parks is a spacious landscaped park in Pārdaugava and got its name in 1923.'),
  (v_hunt_id, 1, 'Water Movement Lab', 56.9402, 24.0857, 'Uzvaras parks, Pārdaugava, Rīga', 'Find the water play area or another place where water, sand, or movement is visible. Watch how something flows, rolls, spins, or changes direction.', 'Riga City says the renewed park includes water equipment where children can experiment with water: pumping it, guiding flows, operating mills, and watching movement.', 'observation', 'Notice one thing that moves: water, wheels, sand, a ball, a scooter, or leaves.', NULL, NULL, NULL, 'Riga City describes special water play equipment that lets children pump water by hand, direct flows, operate mills, and observe water movement.'),
  (v_hunt_id, 2, 'Natural Materials Hunt', 56.9402, 24.0857, 'Uzvaras parks, Pārdaugava, Rīga', 'Find three natural textures in the park: wood, bark, stone, grass, sand, leaves, or soil.', 'The Riga City article says play, sport, and rest elements were placed under existing trees and use natural materials.', 'text', 'Write one natural material you found.', NULL, '["wood","bark","stone","grass","sand","leaf","leaves","soil","tree"]'::jsonb, NULL, 'The renewed active zone was designed so play, sport, and rest elements fit into the landscape under existing trees.'),
  (v_hunt_id, 3, 'Choose Your Movement', 56.9402, 24.0857, 'Uzvaras parks, Pārdaugava, Rīga', 'Pick one safe movement: balance, climb, roll, run, stretch, scooter, cycle, or slow walk. Do it for 30 seconds.', 'Keep it safe and age-appropriate. The prompt is intentionally flexible because park equipment and crowds vary.', 'observation', 'Do one safe movement challenge.', NULL, NULL, NULL, 'Riga City says the renewed park area was planned as a versatile environment for active recreation throughout the year.'),
  (v_hunt_id, 4, 'Park Detail Memory', 56.9402, 24.0857, 'Uzvaras parks, Pārdaugava, Rīga', 'Take one privacy-safe photo of a park detail: texture, sign, path curve, tree shadow, water shape, or play element — no faces.', 'Good photos avoid people and focus on objects, textures, signs, or landscape.', 'photo', 'Take one privacy-safe photo of a park detail.', NULL, NULL, 'Uzvaras Park detail without faces', 'A good park hunt can be about noticing small design choices: where paths bend, how shade works, and what invites kids to move.');

  v_hunt_id := public.seed_scavenger_hunt(
    'riga-barona-playground',
    'Barona Playground Mini Quest',
    'A short movement-and-noticing game for the children’s playground by Krišjāņa Barona iela 116A.',
    '🛝', 'Rīga', 'LV', 'community', 3, 10, 30, 'easy', 250,
    'Source facts: Mapeirons and map listings identify Centra sporta kvartāla bērnu rotaļu laukums at Krišjāņa Barona iela 116/116A, Rīga.'
  );
  INSERT INTO public.hunt_stops (hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint, prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject, reveal_fun_fact) VALUES
  (v_hunt_id, 0, 'Find the Playground', 56.9589, 24.1474, 'Centra sporta kvartāla bērnu rotaļu laukums, Krišjāņa Barona iela 116A, Rīga', 'Start at the children’s playground in Centra sporta kvartāls near Krišjāņa Barona iela 116A.', 'Use the address/source anchor: Krišjāņa Barona iela 116A, Rīga.', 'multiple_choice', 'Which street is this playground connected with?', '["Krišjāņa Barona iela","Doma laukums","Meža prospekts","Rātslaukums"]'::jsonb, '["Krišjāņa Barona iela"]'::jsonb, NULL, 'This mini quest is intentionally short: playground hunts work best when the game supports free play instead of replacing it.'),
  (v_hunt_id, 1, 'Colour + Shape Spy', 56.9589, 24.1474, 'Centra sporta kvartāla bērnu rotaļu laukums, Krišjāņa Barona iela 116A, Rīga', 'Find three colours and two shapes around the playground. They can be on equipment, signs, ground markings, clothes, or shadows.', 'For toddlers, point and name colours together. For older kids, ask them to find unusual shapes.', 'observation', 'Find three colours and two shapes.', NULL, NULL, NULL, 'Colour and shape hunting turns a familiar playground into a tiny observation lab.'),
  (v_hunt_id, 2, 'Kind Movement Challenge', 56.9589, 24.1474, 'Centra sporta kvartāla bērnu rotaļu laukums, Krišjāņa Barona iela 116A, Rīga', 'Choose one safe movement: balance, climb, slide, hop, stretch, or slow-walk. Then let someone else have a turn.', 'The “kind” part matters: kids complete the stop by noticing sharing and turns.', 'observation', 'Do one safe movement and one kind turn-taking moment.', NULL, NULL, NULL, 'Playgrounds teach more than movement: waiting, watching, courage, and turn-taking are all part of the game.'),
  (v_hunt_id, 3, 'Texture Photo', 56.9589, 24.1474, 'Centra sporta kvartāla bērnu rotaļu laukums, Krišjāņa Barona iela 116A, Rīga', 'Take a privacy-safe close-up photo of one texture: rubber ground, metal, wood, rope, sand, leaf, or shadow — no faces.', 'Close-up textures make good memory photos and avoid photographing strangers.', 'photo', 'Take one privacy-safe playground texture photo.', NULL, NULL, 'Playground texture without faces', 'A small texture photo can become a memory trigger: “that was the day we found the bumpy blue ground.”');

  v_hunt_id := public.seed_scavenger_hunt(
    'riga-mezaparks-forest',
    'Mežaparks Forest Weekend Quest',
    'A green Riga hunt for Mežaparks: forest paths, lake-air clues, movement choices, and the cultural landmark of the Grand Bandstand.',
    '🌲', 'Rīga', 'LV', 'nature', 4, 14, 70, 'easy', 1200,
    'Source facts: Latvia Travel Mežaparks page; Mežaparks Grand Bandstand official about page.'
  );
  INSERT INTO public.hunt_stops (hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint, prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject, reveal_fun_fact) VALUES
  (v_hunt_id, 0, 'Green Riga Start', 57.0025, 24.1586, 'Mežaparks, Rīga', 'Start on a safe Mežaparks path. Notice why this place feels different from a normal street.', 'Latvia Travel describes Mežaparks as one of Riga’s greenest and most beautiful neighbourhoods and a popular recreation area.', 'multiple_choice', 'What does “Mežaparks” literally suggest?', '["Forest park","Stone market","Old tower","River bridge"]'::jsonb, '["Forest park"]'::jsonb, NULL, 'Latvia Travel describes Mežaparks as one of the greenest and most beautiful neighbourhoods in Riga and a popular recreation area.'),
  (v_hunt_id, 1, 'Path Explorer', 57.005, 24.158, 'Mežaparks paths, Rīga', 'Choose a safe path and find three nature clues: pine needles, bark, cones, moss, sand, leaves, or birdsong.', 'This is an observation stop. Let kids lead for two minutes if the route is safe.', 'observation', 'Find three nature clues on or near the path.', NULL, NULL, NULL, 'Latvia Travel suggests cycling lanes, forest paths, mini golf, disc golf, and other recreation activities around Mežaparks.'),
  (v_hunt_id, 2, 'Grand Bandstand Sound Clue', 57.0089, 24.1519, 'Mežaparka Lielā estrāde, Rīga', 'If your walk passes the Grand Bandstand, stop and imagine thousands of voices singing together. If not, answer from the clue.', 'The official bandstand page describes it as a cultural and historical structure in the green area of Riga known as Mežaparks.', 'multiple_choice', 'What kind of landmark is Mežaparks Grand Bandstand?', '["Cultural and historical structure","Zoo ticket office","Shopping centre","Airport tower"]'::jsonb, '["Cultural and historical structure"]'::jsonb, NULL, 'The Grand Bandstand official page describes it as a cultural and historical structure in Riga’s green Mežaparks area.'),
  (v_hunt_id, 3, 'Forest Movement Choice', 57.006, 24.163, 'Mežaparks, Rīga', 'Pick a safe movement for 30 seconds: slow walk, fast walk, balance, stretch, cycle, scooter, or quiet listening.', 'Quiet listening counts. This keeps the hunt good for different ages and energy levels.', 'observation', 'Do one safe forest movement or quiet-listening challenge.', NULL, NULL, NULL, 'A good park can support both high-energy movement and quiet noticing. Mežaparks is useful for both.'),
  (v_hunt_id, 4, 'Mežaparks Memory Photo', 57.004, 24.159, 'Mežaparks, Rīga', 'Take one privacy-safe photo of a tree, path, sign, cone, leaf, or shadow pattern — no faces.', 'Close-ups of bark, cones, or path textures work well and avoid strangers.', 'photo', 'Take one privacy-safe Mežaparks detail photo.', NULL, NULL, 'Mežaparks nature or path detail without faces', 'Nature photos are not just souvenirs — they train attention to shape, texture, colour, and season.');

  v_hunt_id := public.seed_scavenger_hunt(
    'riga-agenskalns-green-loop',
    'Āgenskalns Green Loop',
    'A Pārdaugava walk connecting Āgenskalns Market, Māras dīķis, and Arkādijas parks through food, water, bridges, and neighbourhood clues.',
    '🌿', 'Rīga', 'LV', 'community', 5, 14, 85, 'easy', 1800,
    'Source facts: Āgenskalns Market history page; LiveRiga Arkādijas Garden Park page; LiveRiga Pārdaugava green-oases page for Arkādijas parks and Māras dīķis.'
  );
  INSERT INTO public.hunt_stops (hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint, prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject, reveal_fun_fact) VALUES
  (v_hunt_id, 0, 'Āgenskalns Market Start', 56.9381, 24.0711, 'Āgenskalna tirgus, Nometņu iela 64, Rīga', 'Start at Āgenskalns Market. Look for colours, smells, signs, or foods that tell you this is a real neighbourhood meeting place.', 'The market history page says Āgenskalns became an official Riga market in 1863, and that the city bought land in 1895 for a new market.', 'multiple_choice', 'According to the market history page, when did Āgenskalns become an official Riga market?', '["1863","1912","1923","2021"]'::jsonb, '["1863"]'::jsonb, NULL, 'The Āgenskalns Market history page says it became an official Riga market in 1863.'),
  (v_hunt_id, 1, 'Modern Market Clue', 56.9381, 24.0711, 'Āgenskalna tirgus, Nometņu iela 64, Rīga', 'Find one sign of market life: bread, fruit, flowers, coffee, crafts, a menu, or people meeting.', 'The history page describes the market as very modern 100 years ago, with central heating, sewerage, electric lighting, ventilation, storage cellars, a cafe, and a two-floor restaurant.', 'observation', 'Notice one thing that makes the market feel alive today.', NULL, NULL, NULL, 'Āgenskalns Market’s history page says that about 100 years ago it was considered one of Latvia’s most modern markets.'),
  (v_hunt_id, 2, 'Māras dīķis Water Watch', 56.936, 24.078, 'Māras dīķis, Rīga', 'Walk toward Māras dīķis. Stop safely near the water and notice one water clue: reflection, bird, ripple, plant, or bridge view.', 'LiveRiga’s Pārdaugava green-oases page highlights Māras dīķis as a natural resting corner in the city near Arkādijas parks.', 'observation', 'Notice one water clue at Māras dīķis.', NULL, NULL, NULL, 'LiveRiga describes the Māras dīķis area as another natural place for rest in the city, near Arkādijas parks.'),
  (v_hunt_id, 3, 'Arkādijas Bridge Finder', 56.9345, 24.0807, 'Arkādijas parks, Rīga', 'Enter Arkādijas parks and find a bridge, path curve, water feature, or waterfall sound.', 'LiveRiga says Mārupīte was redirected through Arkādijas park, creating cascades, waterfalls, small bridges, and pathways.', 'multiple_choice', 'Which small river runs through Arkādijas Garden Park?', '["Mārupīte","Daugava","Gauja","Lielupe"]'::jsonb, '["Mārupīte"]'::jsonb, NULL, 'LiveRiga says the Mārupīte River was redirected through Arkādijas Garden Park, with cascades, waterfalls, small bridges, and pathways created.'),
  (v_hunt_id, 4, 'Green Loop Memory', 56.9348, 24.0805, 'Arkādijas parks, Rīga', 'Take one privacy-safe photo of a neighbourhood detail: market sign, leaf, bridge, path, water reflection, or texture — no faces.', 'Avoid photographing people at the market or park. Close-up details are better.', 'photo', 'Take one privacy-safe photo that remembers the Āgenskalns loop.', NULL, NULL, 'Āgenskalns / Arkādijas / Māras dīķis detail without faces', 'A neighbourhood hunt connects ordinary places — market, water, paths, and bridges — into one story kids can retell.');
END $$;

DROP FUNCTION public.seed_scavenger_hunt(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, INTEGER, TEXT);
