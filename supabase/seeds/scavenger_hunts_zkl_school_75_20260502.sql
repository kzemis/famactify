-- ============================================================
-- SCV-01 seed — Ziemeļkalifornijas Latviešu skola 75th Anniversary hunt
-- Run after:
--   supabase/migrations/20260502_200000_scavenger_hunts.sql
--   supabase/migrations/20260502_210000_admin_and_hunt_extras.sql
-- ============================================================

ALTER TABLE public.hunt_stops
  ADD COLUMN IF NOT EXISTS parent_hint TEXT,
  ADD COLUMN IF NOT EXISTS clue_text_lv TEXT,
  ADD COLUMN IF NOT EXISTS reveal_fun_fact_lv TEXT;

DO $$
DECLARE
  v_hunt_id UUID;
  v_lat DOUBLE PRECISION := 37.7504615783691;
  v_lon DOUBLE PRECISION := -122.440528869629;
  v_address TEXT := 'Latvian Hall, 425 Hoffman Ave, San Francisco, CA 94114';
BEGIN
  SELECT id INTO v_hunt_id
  FROM public.hunts
  WHERE slug = 'zkl-latvian-school-75';

  IF v_hunt_id IS NULL THEN
    INSERT INTO public.hunts (
      slug, title, blurb, cover_emoji, host_name, city, country_code,
      primary_theme, age_min, age_max, duration_minutes, difficulty,
      est_cost_cents, distance_meters, credits, status, published_at
    ) VALUES (
      'zkl-latvian-school-75',
      'Latviešu skola 75: Anniversary Concert Hunt',
      'A short bilingual hunt for families attending the Northern California Latvian School 75th Anniversary Celebration at Latvian Hall.',
      '🇱🇻',
      'Ziemeļkalifornijas Latviešu skola',
      'San Francisco',
      'US',
      'community',
      5,
      14,
      45,
      'easy',
      0,
      0,
      'Source facts: https://www.zklatviesi.org/ event post “Ziemeļkalifornijas Latviešu skola aicina uz 75 gadu svētku koncertu - 3. maijā”; ZKLB site contact address 425 Hoffman Ave, San Francisco; event poster shared by Kaspars: May 3, 2026 at 12 PM, schoolchildren performances, greetings, raffle, special guest singer Lauris Reiniks.',
      'published',
      '2026-05-02T00:00:00Z'
    )
    RETURNING id INTO v_hunt_id;
  ELSE
    UPDATE public.hunts
    SET
      title = 'Latviešu skola 75: Anniversary Concert Hunt',
      blurb = 'A short bilingual hunt for families attending the Northern California Latvian School 75th Anniversary Celebration at Latvian Hall.',
      cover_emoji = '🇱🇻',
      host_name = 'Ziemeļkalifornijas Latviešu skola',
      city = 'San Francisco',
      country_code = 'US',
      primary_theme = 'community',
      age_min = 5,
      age_max = 14,
      duration_minutes = 45,
      difficulty = 'easy',
      est_cost_cents = 0,
      distance_meters = 0,
      credits = 'Source facts: https://www.zklatviesi.org/ event post “Ziemeļkalifornijas Latviešu skola aicina uz 75 gadu svētku koncertu - 3. maijā”; ZKLB site contact address 425 Hoffman Ave, San Francisco; event poster shared by Kaspars: May 3, 2026 at 12 PM, schoolchildren performances, greetings, raffle, special guest singer Lauris Reiniks.',
      status = 'published',
      published_at = COALESCE(published_at, '2026-05-02T00:00:00Z')
    WHERE id = v_hunt_id;
  END IF;

  DELETE FROM public.hunt_stops WHERE hunt_id = v_hunt_id;
  DELETE FROM public.hunt_sponsors WHERE hunt_id = v_hunt_id;

  INSERT INTO public.hunt_sponsors (hunt_id, name, url, sort_order)
  VALUES (v_hunt_id, 'Ziemeļkalifornijas Latviešu biedrība', 'https://www.zklatviesi.org/', 0);

  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct, prompt_photo_subject,
    reveal_fun_fact
  ) VALUES
  (
    v_hunt_id, 0, 'Find Latvian Hall', v_lat, v_lon, v_address,
    'Start outside or near the entrance. Find the place name for today: Latviešu nams — Latvian Hall. This is where Northern California Latvian community events gather.',
    'Use the address from the poster and ZKLB website: 425 Hoffman Ave, San Francisco. If you are already inside, point out the entrance, program table, or hall sign.',
    'multiple_choice',
    'What is the event venue address?',
    '["425 Hoffman Ave","75 Hoffman Ave","425 Market St","12 Hoffman Ave"]'::jsonb,
    '["425 Hoffman Ave"]'::jsonb,
    NULL,
    'ZKLB lists 425 Hoffman Ave, San Francisco as its contact address. The same address appears on the anniversary concert poster as “Latviešu namā / Latvian Hall.”'
  ),
  (
    v_hunt_id, 1, 'The Big Number', v_lat, v_lon, v_address,
    'Look for the anniversary number on the poster, program, stage, or announcements. It is the number everyone is celebrating today.',
    'The poster says “Ziemeļkalifornijas Latviešu skolai - 75” and “Northern California Latvian School 75th Anniversary Celebration.”',
    'text',
    'What anniversary number is the Latvian School celebrating?',
    NULL,
    '["75","seventy five","seventy-five","75th"]'::jsonb,
    NULL,
    'A 75th anniversary means the school has carried Latvian language and culture across many generations of Bay Area families.'
  ),
  (
    v_hunt_id, 2, 'Say the School Name', v_lat, v_lon, v_address,
    'Find the Latvian name of the school. Try saying it slowly: Zie-meļ-ka-li-for-ni-jas Lat-vie-šu sko-la.',
    'Point to the words “Ziemeļkalifornijas Latviešu skola.” Kids can answer by choosing the full school name.',
    'multiple_choice',
    'Which phrase means “Northern California Latvian School”?',
    '["Ziemeļkalifornijas Latviešu skola","Sanfrancisko Jaunais teātris","Tautas deju kopa Ritenītis","Ziemeļkalifornijas Latviešu koris"]'::jsonb,
    '["Ziemeļkalifornijas Latviešu skola"]'::jsonb,
    NULL,
    '“Skola” means “school” in Latvian. ZKLB’s website lists the school as one of the organizations under the Northern California Latvian Association.'
  ),
  (
    v_hunt_id, 3, 'Performance Detective', v_lat, v_lon, v_address,
    'During the program, listen for schoolchildren performing. Notice one thing: a song, a poem, a costume detail, a word you understand, or a moment that makes people smile.',
    'The event poster says the program includes performances by schoolchildren. Ask your kid to choose one memory, not to interrupt the program.',
    'observation',
    'Remember one detail from a schoolchild performance.',
    NULL,
    NULL,
    NULL,
    'The poster says the celebration program includes “skolas bērnu priekšnesumi” — performances by schoolchildren. That makes the kids, not just adults, the center of the celebration.'
  ),
  (
    v_hunt_id, 4, 'Special Guest Clue', v_lat, v_lon, v_address,
    'The poster names a special guest singer. Find the name on the poster or listen for it during the greetings.',
    'The special guest listed on the poster is singer Lauris Reiniks.',
    'multiple_choice',
    'Who is the special guest singer listed for the concert?',
    '["Lauris Reiniks","Una Veilande","Astrīda Ramāns","Ritenītis"]'::jsonb,
    '["Lauris Reiniks"]'::jsonb,
    NULL,
    'The event poster says the program includes greetings, a raffle, and special guest singer Lauris Reiniks.'
  ),
  (
    v_hunt_id, 5, 'Pattern Memory', v_lat, v_lon, v_address,
    'Find a Latvian pattern, green-white poster detail, program detail, or decoration. Take a privacy-safe photo — no kids’ faces, please.',
    'Good photo subjects: the poster border pattern, a printed program, a sign, a decoration, or a close-up of fabric/pattern. Avoid photographing children or private moments.',
    'photo',
    'Take one privacy-safe photo of a Latvian pattern, sign, or event detail.',
    NULL,
    NULL,
    'Latvian pattern, sign, or event detail without faces',
    'Latvian visual culture often uses geometric folk patterns. In a community event, those patterns become a small bridge between language, music, memory, and belonging.'
  );

  UPDATE public.hunt_stops
  SET
    clue_text_lv = CASE stop_order
      WHEN 0 THEN 'Sāc ārā vai pie ieejas. Atrodi šodienas vietas nosaukumu: Latviešu nams — Latvian Hall. Te pulcējas Ziemeļkalifornijas latviešu kopiena.'
      WHEN 1 THEN 'Meklē jubilejas skaitli uz afišas, programmā, uz skatuves vai apsveikumos. Tas ir skaitlis, ko šodien visi svin.'
      WHEN 2 THEN 'Atrodi skolas latvisko nosaukumu. Pamēģini to pateikt lēnām: Zie-meļ-ka-li-for-ni-jas Lat-vie-šu sko-la.'
      WHEN 3 THEN 'Programmas laikā ieklausies skolas bērnu priekšnesumos. Ievēro vienu lietu: dziesmu, dzejoli, tērpa detaļu, saprotamu vārdu vai brīdi, kas cilvēkiem liek smaidīt.'
      WHEN 4 THEN 'Afišā ir minēts īpašais viesis — dziedātājs. Atrodi viņa vārdu uz afišas vai ieklausies apsveikumos.'
      WHEN 5 THEN 'Atrodi latviešu rakstu, zaļi baltu afišas detaļu, programmas detaļu vai rotājumu. Uzņem privātumam drošu foto — bez bērnu sejām, lūdzu.'
      ELSE clue_text_lv
    END,
    reveal_fun_fact_lv = CASE stop_order
      WHEN 0 THEN 'ZKLB savā mājaslapā norāda adresi 425 Hoffman Ave, San Francisco. Tā pati adrese redzama jubilejas koncerta afišā kā “Latviešu namā / Latvian Hall”.'
      WHEN 1 THEN '75 gadu jubileja nozīmē, ka skola jau daudzās Piejūras līča ģimeņu paaudzēs ir nesusi latviešu valodu un kultūru.'
      WHEN 2 THEN '“Skola” latviski nozīmē “school”. ZKLB mājaslapā skola ir minēta kā viena no Ziemeļkalifornijas Latviešu biedrības organizācijām.'
      WHEN 3 THEN 'Afišā rakstīts, ka svētku programmā ir “skolas bērnu priekšnesumi”. Tas nozīmē, ka svētku centrā ir arī bērni, ne tikai pieaugušie.'
      WHEN 4 THEN 'Pasākuma afišā rakstīts, ka programmā būs apsveikumi, loterija un īpašais viesis — dziedātājs Lauris Reiniks.'
      WHEN 5 THEN 'Latviešu vizuālajā kultūrā bieži izmanto ģeometriskus tautas rakstus. Kopienas pasākumā tie kļūst par mazu tiltu starp valodu, mūziku, atmiņām un piederību.'
      ELSE reveal_fun_fact_lv
    END
  WHERE hunt_id = v_hunt_id;
END $$;
