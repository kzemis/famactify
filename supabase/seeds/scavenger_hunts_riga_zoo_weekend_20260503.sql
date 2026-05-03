-- ============================================================
-- SCV-01 seed — Riga Zoo Weekend Animal Detective
-- Run after:
--   supabase/migrations/20260502_200000_scavenger_hunts.sql
--   supabase/migrations/20260502_210000_admin_and_hunt_extras.sql
-- ============================================================

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS parent_hint TEXT;

DO $$
DECLARE
  v_hunt_id UUID;
  v_lat DOUBLE PRECISION := 57.00664;
  v_lon DOUBLE PRECISION := 24.15947;
  v_address TEXT := 'Rīgas Nacionālais zooloģiskais dārzs, Meža prospekts 1, Rīga, LV-1014';
BEGIN
  SELECT id INTO v_hunt_id
  FROM public.hunts
  WHERE slug = 'riga-zoo-weekend';

  IF v_hunt_id IS NULL THEN
    INSERT INTO public.hunts (
      slug, title, blurb, cover_emoji, host_name, city, country_code,
      primary_theme, age_min, age_max, duration_minutes, difficulty,
      est_cost_cents, distance_meters, credits, status, published_at
    ) VALUES (
      'riga-zoo-weekend',
      'Riga Zoo Weekend Animal Detective',
      'A flexible Riga Zoo scavenger game for noticing habitats, animal clues, and conservation stories without rushing from cage to cage.',
      '🦒',
      'FamActify Original',
      'Rīga',
      'LV',
      'nature',
      4,
      14,
      75,
      'easy',
      0,
      1000,
      'Source facts: Riga City page for Rīgas Nacionālais zooloģiskais dārzs, including address, Mežaparks location, 1912 history, nearly 400 species, and named zoo areas such as the Farmstead, Terrarium, Tropical House, Aquarium, Latvian reptile and amphibian hall, and Osteostāsti. Link: https://www.riga.lv/lv/strukturvieniba/sia-rigas-nacionalais-zoologiskais-darzs',
      'published',
      '2026-05-03T00:00:00Z'
    )
    RETURNING id INTO v_hunt_id;
  ELSE
    UPDATE public.hunts
    SET
      title = 'Riga Zoo Weekend Animal Detective',
      blurb = 'A flexible Riga Zoo scavenger game for noticing habitats, animal clues, and conservation stories without rushing from cage to cage.',
      cover_emoji = '🦒',
      host_name = 'FamActify Original',
      city = 'Rīga',
      country_code = 'LV',
      primary_theme = 'nature',
      age_min = 4,
      age_max = 14,
      duration_minutes = 75,
      difficulty = 'easy',
      est_cost_cents = 0,
      distance_meters = 1000,
      credits = 'Source facts: Riga City page for Rīgas Nacionālais zooloģiskais dārzs, including address, Mežaparks location, 1912 history, nearly 400 species, and named zoo areas such as the Farmstead, Terrarium, Tropical House, Aquarium, Latvian reptile and amphibian hall, and Osteostāsti. Link: https://www.riga.lv/lv/strukturvieniba/sia-rigas-nacionalais-zoologiskais-darzs',
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
    v_hunt_id, 0, 'Zoo Gate: Find Meža Prospekts 1', v_lat, v_lon, v_address,
    'Start at the zoo entrance. Find the place name or address before you go animal-detective mode.',
    'The source-backed address is Meža prospekts 1, Rīga, LV-1014. Any entrance sign, ticket, or map can help.',
    'multiple_choice',
    'What is Riga Zoo’s address?',
    '["Meža prospekts 1","Brīvības bulvāris 1","Doma laukums 1","Rātslaukums 7"]'::jsonb,
    '["Meža prospekts 1"]'::jsonb,
    NULL,
    'Riga City lists Riga National Zoological Garden at Meža prospekts 1 in Rīga, in the heart of Mežaparks.'
  ),
  (
    v_hunt_id, 1, 'Zoo Birthday Clue', v_lat, v_lon, v_address,
    'Look for a map, sign, or information board that tells the story of the zoo. Your mission is to find how old this place is.',
    'If there is no history sign nearby, read this one aloud: Riga Zoo has been in Mežaparks since 1912.',
    'multiple_choice',
    'According to Riga City, since what year has Riga Zoo been in Mežaparks?',
    '["1912","1935","1991","2021"]'::jsonb,
    '["1912"]'::jsonb,
    NULL,
    'Riga City says Riga National Zoological Garden has been in the heart of Mežaparks since 1912.'
  ),
  (
    v_hunt_id, 2, 'Nearly 400 Species Challenge', v_lat, v_lon, v_address,
    'Walk slowly and choose three different animals you notice. They can be big, tiny, furry, scaly, swimming, resting, or hiding.',
    'This is an observation stop. The source says the zoo invites visitors to discover nearly 400 different animal species, but kids only need to notice three.',
    'observation',
    'Notice three different animal species or animal homes.',
    NULL,
    NULL,
    NULL,
    'Riga City says Riga Zoo is home to nearly 400 different animal species.'
  ),
  (
    v_hunt_id, 3, 'Indoor Homes Detective', v_lat, v_lon, v_address,
    'Find one indoor animal home: Farmstead, Terrarium, Tropical House, Aquarium, or another indoor exhibit. What changes inside compared with outside?',
    'The Riga City source names several indoor areas: Farmstead, Terrarium, Tropical House, Aquarium, and the Latvian reptile and amphibian hall.',
    'multiple_choice',
    'Which of these is named by Riga City as a Riga Zoo area?',
    '["Tropical House","Moon Rocket Room","Dinosaur Airport","Chocolate Castle"]'::jsonb,
    '["Tropical House"]'::jsonb,
    NULL,
    'Riga City says visitors can look into indoor animal homes including the Farmstead, Terrarium, Tropical House, and Aquarium.'
  ),
  (
    v_hunt_id, 4, 'Animal Movement Minute', v_lat, v_lon, v_address,
    'Pick one animal you can watch respectfully for one quiet minute. How does it move: crawl, swim, jump, climb, fly, waddle, or rest?',
    'Let the child choose any visible animal. If animals are resting or hidden, resting also counts as behaviour.',
    'text',
    'Write one movement word you noticed.',
    NULL,
    '["crawl","swim","jump","climb","fly","waddle","walk","run","rest","sleep","hide","eat"]'::jsonb,
    NULL,
    'A zoo visit is not only about seeing animals up close. Careful watching helps kids notice habitats, behaviour, and how different animals use their bodies.'
  ),
  (
    v_hunt_id, 5, 'Osteostāsti: Bone Story', v_lat, v_lon, v_address,
    'If your route passes the Hippo House / Osteostāsti exhibit, look for the “bone story.” If not, answer from the clue.',
    'The Riga City source says the Osteostāsti exhibition in the Hippo House displays the skull and tusks of the famous elephant Radža.',
    'multiple_choice',
    'Which famous animal is connected with the Osteostāsti skull and tusks story?',
    '["Elephant Radža","Tiger Toms","Seal Krista","Rabbit Rūdis"]'::jsonb,
    '["Elephant Radža"]'::jsonb,
    NULL,
    'Riga City says the Hippo House exhibition “Osteostāsti” displays the skull and tusks of the famous elephant Radža.'
  ),
  (
    v_hunt_id, 6, 'Kind Zoo Memory', v_lat, v_lon, v_address,
    'Before you leave, take one privacy-safe photo of a sign, map, habitat detail, animal statue, leaf, footprint shape, or texture — no faces.',
    'Good subjects: a map corner, habitat sign, animal silhouette, feather/leaf texture, or public sign. Avoid photographing strangers or children.',
    'photo',
    'Take one privacy-safe photo of a zoo detail that helps you remember the visit.',
    NULL,
    NULL,
    'Zoo detail, sign, habitat, texture, or map without faces',
    'The best zoo memories are often small details: a sound, a pattern, a footprint shape, a sign, or a careful question asked at the right moment.'
  );
END $$;
