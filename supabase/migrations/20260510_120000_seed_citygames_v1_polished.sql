-- ============================================================
-- SCV-CG-01/02/02-LITE — Upsert polished CityGames into hunts table
-- so admins can edit them from /admin/hunts (upload cover image,
-- tweak text, etc.) instead of only living in code seeds.
--
-- This migration is idempotent: re-running replaces all stops with
-- the polished content. Admin edits made after a run get overwritten
-- by the next run. Treat this as the one-shot canonical content seed.
--
-- Inserts:
--   1. Richmond Rosie the Riveter (8 steps)
--   2. Oakland Black Panther Community Power (8 steps)
--   3. Lake Merritt Lakeshore Evening (6 steps)
--
-- created_by is left NULL. RLS allows admins (profiles.is_admin) to
-- update any hunt — so the user can edit these from /admin/hunts
-- without an "ownership" wall.
-- ============================================================


-- ═══════════════════════════════════════════════════════════════
-- 1) ROSIE THE RIVETER
-- ═══════════════════════════════════════════════════════════════
DO $rosie$
DECLARE
  hunt_uuid uuid;
BEGIN
  INSERT INTO public.hunts (
    slug, title, blurb, cover_emoji, host_name, city, country_code,
    primary_theme, age_min, age_max, duration_minutes, difficulty,
    est_cost_cents, distance_meters, credits, source_links,
    generation_notes, status, visibility, published_at,
    artifact_kind, artifact_version, created_via, created_by
  ) VALUES (
    'richmond-rosie-the-riveter',
    $body$Rosie the Riveter — Richmond Home Front City Game$body$,
    $body$How did war work change women, families, and a city? Walk Richmond's WWII waterfront, meet the real people behind Rosie, and make your own family memory.$body$,
    '💪',
    'FamActify Original',
    'Richmond',
    'US',
    'history', 8, 14, 180, 'medium', 0, 3500,
    $body$Anchored on Rosie the Riveter / WWII Home Front National Historical Park (NPS). Inspired by David Riemer's Brockton CityGames philosophy: history is everyday people, their jobs, and lives.$body$,
    ARRAY[
      'https://www.nps.gov/rori/index.htm',
      'https://www.nps.gov/rori/learn/historyculture/who-was-rosie-the-riveter.htm',
      'https://www.nps.gov/rori/learn/historyculture/historic-richmond-shipyards.htm',
      'https://www.nps.gov/places/rosie-the-riveter-visitor-education-center.htm',
      'https://www.nps.gov/places/ss-red-oak-victory-ship.htm',
      'https://www.nps.gov/rori/planyourvisit/rosie-the-riveter-memorial.htm',
      'https://www.nytimes.com/2018/01/22/obituaries/naomi-parker-fraley-the-real-rosie-the-riveter-dies-at-96.html',
      'https://www.smithsonianmag.com/history/myth-rosie-the-riveter-180954625/',
      'https://commons.wikimedia.org/wiki/File:Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg'
    ]::text[],
    $body$CityGame v1 polish (2026-05-10): copy tightened to be kid-actionable rather than museum-like; reveals lead with the surprising specific (95-year-old Naomi, 90,000 migrants, 747 ships, 4d-15h-26m record); parentHints now include literal sentences a parent can say aloud; final time capsule reveal mirrors back the Rosie arc. All facts are anchored in NPS / Smithsonian / NYT sources listed above. Field-verify exact walking order, current access, and best camera angle before publishing broadly.$body$,
    'published', 'public', '2026-05-02T00:00:00Z',
    'scavenger_hunt', 1, 'human', NULL
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title, blurb = EXCLUDED.blurb, cover_emoji = EXCLUDED.cover_emoji,
    host_name = EXCLUDED.host_name, city = EXCLUDED.city, country_code = EXCLUDED.country_code,
    primary_theme = EXCLUDED.primary_theme, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max,
    duration_minutes = EXCLUDED.duration_minutes, difficulty = EXCLUDED.difficulty,
    est_cost_cents = EXCLUDED.est_cost_cents, distance_meters = EXCLUDED.distance_meters,
    credits = EXCLUDED.credits, source_links = EXCLUDED.source_links,
    generation_notes = EXCLUDED.generation_notes, status = EXCLUDED.status,
    visibility = EXCLUDED.visibility, published_at = EXCLUDED.published_at,
    updated_at = now()
  RETURNING id INTO hunt_uuid;

  DELETE FROM public.hunt_stops WHERE hunt_id = hunt_uuid;

  -- Step 1: The poster — was Rosie real?
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 0, 'The poster: was Rosie real?', 37.9032, -122.3659,
    '1414 Harbour Way South #3000, Richmond, CA 94804',
    $body$Step inside the Visitor Education Center. Find the famous "We Can Do It!" poster — small, blue, yellow, with a woman in a red polka-dot bandana flexing her arm. Look at her face for ten whole seconds before you answer. Was she one real person, or a stand-in for millions?$body$,
    $body$Try asking out loud: "When ONE picture becomes famous for MILLIONS of people, whose names get lost?" Let the kid sit with that.$body$,
    'multiple_choice',
    $body$Who is now believed to be the real-life inspiration behind the "We Can Do It!" poster?$body$,
    '["Naomi Parker Fraley","Geraldine Hoff Doyle","Rose Will Monroe","Mary Keefe"]'::jsonb,
    '["Naomi Parker Fraley"]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$For seventy years no one was sure who the real woman in the poster was. In 2016 a researcher proved it was Naomi Parker Fraley — a riveter at Naval Air Station Alameda, right across the Bay. She was 95 years old when she found out. She lived just long enough to see her own face on T-shirts, mugs, and history books before she passed away in 2018.$body$
  );

  -- Step 2: Rosie then / you now (Full Story timeline)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 1, 'Rosie then / you now', 37.9032, -122.3659,
    '1414 Harbour Way South #3000, Richmond, CA 94804',
    $body$Stay near the story walls inside the Visitor Center. The poster is the icon — now make the icon part of YOUR family's memory. Open Full Story mode and capture three layers in one photo: today's wall, the old Rosie reference, and your family's face beside her.$body$,
    $body$Use Full Story mode so the saved memory shows today's place + the old Rosie image + your selfie. Don't worry about copying her pose — the point is "we were here, we saw her, we remembered."$body$,
    'time_travel_photo',
    $body$Create a Full Story timeline photo: today's place, the old Rosie reference, and your selfie — all in one frame.$body$,
    NULL, NULL,
    $body$Rosie reference image with today's Visitor Center memory and selfie$body$,
    NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":"https://ca-times.brightspotcdn.com/dims4/default/9ce7182/2147483647/strip/true/crop/817x1024+0+0/resize/1200x1504!/format/webp/quality/75/?url=https%3A%2F%2Fcalifornia-times-brightspot.s3.amazonaws.com%2F01%2F82%2F9f987139a3227dfa0c013a3fbb12%2Fla-me-c1-rosie-riveter-pictures-005","timeTravelCaption":"Rosie/Riveter reference image provided by user via Los Angeles Times CDN. Rights must be verified or replaced with a licensed source before public release.","timeTravelOpacity":0.5}$meta$::jsonb,
    $body$The poster was never the point. The point is the question it asks YOU: whose work do you want to be remembered? Your photo just answered, "ours."$body$
  );

  -- Step 3: Find the people behind the poster (observation)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 2, 'Find the people behind the poster', 37.9032, -122.3659,
    '1414 Harbour Way South #3000, Richmond, CA 94804',
    $body$Rosie was a symbol — but this whole building is full of REAL people. Go hunting for three things you can point to: one worker's face you'd recognise tomorrow, one tool you've never held in your life, and one word that surprises you (like "rivet," "swing-shift," or "child-care center").$body$,
    $body$This is the "make history human" stop. After they spot their three things, ask: "If one of these faces looked like our family, what would their day have been like?"$body$,
    'observation',
    'Find three clues that show real wartime workers and families were here: one face, one object, and one word.',
    NULL, NULL, NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$More than 90,000 people moved to Richmond in just four years for shipyard work — Black families leaving the South, white families leaving Oklahoma, women who had never held a paying job. Schools doubled. Houses went up overnight. Child-care centers opened around the clock so mothers could work night shifts. A small town became a city in the time it takes a kid to grow from kindergarten to fourth grade.$body$
  );

  -- Step 4: Shipyard then / waterfront now (time_travel_photo)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 3, 'Shipyard then / waterfront now', 37.9032, -122.3659,
    'Ford Point / Craneway waterfront, near the Visitor Education Center',
    $body$Step outside toward the water. Close your eyes for three seconds and imagine 90,000 people walking past, three shifts a day, every day, building ships. Now open them. Hold up the old shipyard image against today's quiet waterfront. What's gone? What's still here? Where would all those workers have lived?$body$,
    $body$Don't stress about lining up the photo perfectly. The conversation while you do it matters more than a clean overlay.$body$,
    'time_travel_photo',
    $body$Take a timeline photo: line up the old shipbuilding image with today's waterfront. Use Full Story mode if you want your selfie in the memory too.$body$,
    NULL, NULL,
    'Richmond shipyard then-and-now comparison',
    NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":"https://upload.wikimedia.org/wikipedia/commons/c/c6/Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg","timeTravelCaption":"Liberty ship section being moved at Richmond Shipyard No. 2 during WWII. Public-domain image via Wikimedia Commons / Imperial War Museums.","timeTravelOpacity":0.48}$meta$::jsonb,
    $body$Richmond didn't build ships the slow old way — workers built giant sections separately, then welded them together like a city-sized puzzle. The record-breaker, the SS Robert E. Peary, was launched 4 days, 15 hours, and 26 minutes after its first piece was laid down. Most of the welders were women.$body$
  );

  -- Step 5: Red Oak Victory — what did work sound like? (audio)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 4, 'SS Red Oak Victory: what did work sound like?', 37.917, -122.3603,
    '1337 Canal Boulevard, Richmond, CA 94804',
    $body$Find the Red Oak Victory — the LAST surviving ship built in Richmond's Kaiser shipyards. Stand close. Close your eyes for three seconds and imagine cranes, welding sparks, hammers, voices in a dozen languages, water hitting metal. Then press record.$body$,
    $body$If the ship is closed today (it usually opens Sundays), the harbour near the Visitor Center works just as well. The point is to feel scale through your ears, not just read it on a sign.$body$,
    'audio',
    $body$Record 5 seconds of harbour or shipyard sound — wind, water, footsteps, or your own "clang clang" shipbuilding sound.$body$,
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":"Harbour, wind, water, footsteps, or a pretend shipbuilding clang","audioMaxSeconds":5,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$Richmond's four Kaiser shipyards built 747 ships during WWII — more than any shipyard complex in WORLD HISTORY. The Red Oak Victory is the only one of those 747 still here. Volunteers keep her alive the way grandparents keep stories alive: one weekend at a time.$body$
  );

  -- Step 6: Rosie Memorial — draw the work (drawing)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 5, 'Rosie Memorial: draw the work', 37.9072, -122.3611,
    'Marina Bay Park, 1900 Esplanade Drive, Richmond, CA 94804',
    $body$Walk the Rosie the Riveter Memorial. The walkway is the length of a real Liberty ship's keel — 441 feet — and it points toward the Bay. Find one shape: a name on the timeline, a quote on the white granite, a steel curve like a hull, a worker's tool. Pick one and draw it.$body$,
    $body$Ask: "Why a SHIP shape? Why not a statue of a person? What does that say about how women's work usually gets remembered — or doesn't?"$body$,
    'drawing',
    'Draw the outline of a Liberty ship, a rivet, a timeline mark, a worker tool, or one shape you notice at the memorial.',
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":"A Liberty ship outline, rivet, timeline mark, worker tool, or memorial shape","timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$Most monuments honour leaders or soldiers. This one honours the welder, the riveter, the mom who fed her kids before her shift, the grandmother who learned to drive a forklift at fifty. The walkway lines up with the Golden Gate Bridge — and the timeline panels carry the workers' OWN words, not a politician's.$body$
  );

  -- Step 7: Make your own Rosie memory (photo)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 6, 'Make your own Rosie memory', 37.9072, -122.3611,
    'Rosie the Riveter Memorial, Marina Bay Park',
    $body$End the walk with a photo. Roll up your sleeve. Make a fist. Give your best "We Can Do It!" face. OR — invent your own pose. What does strength look like in YOUR family? (Yes, grown-ups too. Especially grown-ups.)$body$,
    $body$Keep it playful. If the kid feels shy, let them photograph YOU doing the pose first. The point is a real family memory, not a perfect copy of a poster.$body$,
    'photo',
    'Take a Rosie-pose or family-strength photo together to remember the city game.',
    NULL, NULL,
    $body$Rosie pose, family work pose, or "we can do it" memory$body$,
    NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$The "We Can Do It!" poster was barely seen during WWII — Westinghouse hung it inside their factories for two weeks in 1943, then took it down. It sat forgotten for forty years. It became famous in the 1980s, decades after Rosie's real generation had retired and grown grey. Sometimes the symbol arrives long after the work.$body$
  );

  -- Step 8: Family time capsule (text reflection)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 7, 'Family time capsule', NULL, NULL, NULL,
    $body$One last step. Find a bench, a quiet patch of grass, or just stand together. Think of ONE person in your family — past or present — whose work matters but isn't famous. A grandmother who raised five kids. An uncle who fixes everyone's cars. A parent who packs lunches at 6 AM. Type one sentence about them.$body$,
    $body$If a grandparent isn't with you, this is a good moment to call them right now. Ask: "What's one thing about your work I should know?" Their answer is the time capsule.$body$,
    'text',
    $body$Write one sentence for the family time capsule: "In our family, work worth remembering is…"$body$,
    NULL,
    '[]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$Naomi Parker Fraley wasn't famous until she was 95. The women of Richmond's shipyards weren't called heroes when they were young — they were called "Mrs." and "Ma'am" and went home to cook dinner. Memory is the gift you give the future. Today you gave one.$body$
  );

END $rosie$;


-- ═══════════════════════════════════════════════════════════════
-- 2) OAKLAND BLACK PANTHER COMMUNITY POWER
-- ═══════════════════════════════════════════════════════════════
DO $panther$
DECLARE
  hunt_uuid uuid;
BEGIN
  INSERT INTO public.hunts (
    slug, title, blurb, cover_emoji, host_name, city, country_code,
    primary_theme, age_min, age_max, duration_minutes, difficulty,
    est_cost_cents, distance_meters, credits, source_links,
    generation_notes, status, visibility, published_at,
    artifact_kind, artifact_version, created_via, created_by
  ) VALUES (
    'oakland-black-panther-heritage',
    $body$Oakland Black Panther Community Power City Game$body$,
    $body$How did Oakland kids and neighbours organize to take care of each other? A respectful family walk through the West Oakland places where the Black Panther Party was born — and where its breakfast, school, and clinic ideas still echo today.$body$,
    '🐆',
    'FamActify Original',
    'Oakland',
    'US',
    'history', 9, 16, 150, 'medium', 0, 4500,
    $body$Inspired by David Riemer's 1982 Brockton CityGames philosophy: history is everyday people, their homes, jobs, and lives. Please walk respectfully — these are real neighbourhoods where real families still live.$body$,
    ARRAY[
      'https://en.wikipedia.org/wiki/Black_Panther_Party',
      'https://en.wikipedia.org/wiki/Free_Breakfast_for_Children',
      'https://en.wikipedia.org/wiki/Bobby_Hutton',
      'https://en.wikipedia.org/wiki/Elaine_Brown',
      'https://en.wikipedia.org/wiki/Ericka_Huggins',
      'https://www.visitoakland.com/listing/west-oakland-mural-project/6280/',
      'https://home.nps.gov/articles/000/the-west-oakland-mural-project-oakland-california.htm',
      'https://lakemerrittinstitute.org/about-lake-merritt/',
      'https://commons.wikimedia.org/wiki/File:Lake_Merritt,_Oakland,_California-LCCN2008678131.jpg'
    ]::text[],
    $body$CityGame v1 polish (2026-05-10): copy tightened to be kid-actionable; reveals lead with specific names + dates (Newton 24 / Seale 30 / Hutton 17 / Brown chair 1974–77 / Huggins Oakland Community School / FBI quote / 20,000 kids / NSBP 1975); parentHints now contain literal sentences to say aloud; added Step 8 family-community time capsule to mirror Rosie's arc. All facts are anchored in NPS / Wikipedia / Visit Oakland / Lake Merritt Institute sources listed above. Field-verify exact plaque wording, mural condition, and St. Augustine's signage before publishing broadly.$body$,
    'published', 'public', '2026-05-02T00:00:00Z',
    'scavenger_hunt', 1, 'human', NULL
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title, blurb = EXCLUDED.blurb, cover_emoji = EXCLUDED.cover_emoji,
    host_name = EXCLUDED.host_name, city = EXCLUDED.city, country_code = EXCLUDED.country_code,
    primary_theme = EXCLUDED.primary_theme, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max,
    duration_minutes = EXCLUDED.duration_minutes, difficulty = EXCLUDED.difficulty,
    est_cost_cents = EXCLUDED.est_cost_cents, distance_meters = EXCLUDED.distance_meters,
    credits = EXCLUDED.credits, source_links = EXCLUDED.source_links,
    generation_notes = EXCLUDED.generation_notes, status = EXCLUDED.status,
    visibility = EXCLUDED.visibility, published_at = EXCLUDED.published_at,
    updated_at = now()
  RETURNING id INTO hunt_uuid;

  DELETE FROM public.hunt_stops WHERE hunt_id = hunt_uuid;

  -- Step 1: Why a panther? (multiple choice)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 0, 'Why a panther?', 37.803, -122.2755,
    '5714 Martin Luther King Jr Way, Oakland, CA',
    $body$You're standing where it began. In October 1966, two students at this very campus — Huey Newton, 24, and Bobby Seale, 30 — wrote a list of ten demands for change. They needed a symbol. They picked an animal that, in Bobby's words, "doesn't strike first, but never backs down when it's cornered." Find the historical marker. Which animal?$body$,
    $body$Try asking: "Newton was 24. Seale was 30. By today's standards, how old is that? Old enough to start something this big?"$body$,
    'multiple_choice',
    'Which animal did Huey and Bobby choose for the party''s name?',
    '["Black panther","Black eagle","Black bear","Black wolf"]'::jsonb,
    '["Black panther"]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$The Black Panther Party for Self-Defense launched October 1966 with a 10-point program demanding decent housing, jobs, education, food, and an end to police brutality. Newton was 24. Seale was 30. They were barely older than the kids who'd soon line up at dawn for the breakfasts the Panthers would cook.$body$
  );

  -- Step 2: First and youngest (text)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 1, 'First and youngest', 37.8092, -122.2895,
    '1651 Adeline Street, Oakland, CA 94607',
    $body$This park used to be called DeFremery. It was renamed in honour of Bobby Hutton — a 16-year-old who became the Panthers' very first recruit and treasurer. He was killed by Oakland police at 17. Find the memorial marker and read his dates.$body$,
    $body$This stop is heavy. It's okay to pause. Try asking: "What does it mean that someone joined a movement before they were old enough to drive?"$body$,
    'text',
    'How old was Bobby Hutton when he died? (Just type the number.)',
    NULL,
    '["17","seventeen"]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$Bobby Hutton was 16 when he became member #1. He died at 17 on April 6, 1968 — two days after Dr. King was killed in Memphis. DeFremery Park became a centre of Black community life: jazz, youth programs, Panther survival programs, family Sundays. Renaming the park made the memorial something you walk through, not just look at.$body$
  );

  -- Step 3: Breakfast as resistance (audio)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 2, 'Breakfast as resistance', 37.8155, -122.2737,
    '525 29th Street, Oakland, CA 94609',
    $body$In January 1969, the Black Panthers started a program right here that fed thousands of kids before school — free, hot, every weekday morning. Eggs, grits, toast, hot chocolate. What did they call it? Say the name out loud, or make one welcoming breakfast sound.$body$,
    $body$Try asking: "How is feeding a hungry kid every morning before school a kind of political change?" The Panthers had a clear answer — see if your kid finds theirs.$body$,
    'audio',
    $body$Step aside safely and record 5 seconds — say "Free Breakfast for Children", or make one welcoming breakfast sound (pan, kettle, "good morning!").$body$,
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":"The player saying Free Breakfast for Children, or a welcoming breakfast sound","audioMaxSeconds":5,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$At its peak the Panthers fed 20,000+ kids every weekday across the country. The FBI called the breakfast program "the greatest internal threat to national security." Six years later, in 1975, the federal government permanently expanded the National School Breakfast Program. Sometimes a thing the government calls a threat becomes a thing the government copies.$body$
  );

  -- Step 4: Who led the Panthers? (photo of mural)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 3, 'Who led the Panthers?', 37.8068, -122.2948,
    '831 Center Street, Oakland, CA 94607',
    $body$Find a safe public view of the Women of the Black Panther Party mural. Stay on the sidewalk and look. Most history books show two men. By the mid-1970s, two out of every three Panthers were women. Find one face you'd recognise tomorrow, one word painted big, one symbol of care.$body$,
    $body$Keep it respectful — this is public art on someone's neighbourhood. Try asking: "Whose face is missing from the famous photos? Why do you think that happened?"$body$,
    'photo',
    'Take a privacy-safe photo of one mural detail: a colour, face, word, raised hand, food basket, or care symbol. Avoid close-ups of bystanders.',
    NULL, NULL,
    'Women of the Black Panther Party mural detail without close-up faces of bystanders',
    NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$By the mid-1970s, more than two-thirds of Black Panther members were women. Elaine Brown ran the entire Party as Chairwoman from 1974 to 1977. Ericka Huggins led the Oakland Community School — which California State Assembly called the best alternative school in the state. The poster icons get the men. This mural fixes that.$body$
  );

  -- Step 5: Arrive at the lake (observation)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 4, 'Arrive at the lake', 37.8044, -122.2595,
    '666 Bellevue Avenue, Oakland, CA 94610',
    $body$You're at Lake Merritt now — Oakland's public living room. Slow down. The Panthers ran their survival programs not far from here. Find two signs of community right now: people sharing space, birds using the water, a bench, a path, a meeting place.$body$,
    $body$This is a calm reset after heavy stops. Try asking: "What does this lake do for the city today? What does community mean if we're looking, not just reading?"$body$,
    'observation',
    'Notice two clues that show this lake is a community place.',
    NULL, NULL, NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$Lake Merritt is a tidal lagoon — saltwater from the Bay, breathing in and out twice a day. It was declared a wildlife refuge in 1870, the first such refuge in the United States. A century before the Panthers fed kids here, the city had already decided this water and these birds belonged to everyone.$body$
  );

  -- Step 6: Then / now: who shared this lake? (time_travel_photo)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 5, 'Then / now: who shared this lake?', 37.8044, -122.2595,
    'Lake Merritt shoreline, Oakland, CA',
    $body$Hold up the old Lake Merritt image and compare with today. Look at who's in the historic photo, and who's walking past you now. What stayed? What changed? Who got to be in a city's "showplace" picture, and who got left out of the frame?$body$,
    $body$Try asking: "Old postcards show what a city wanted to be proud of. Who do you think was missing from the original picture?"$body$,
    'time_travel_photo',
    $body$Take a now + history photo: line up the old Lake Merritt image with the shoreline. Use Full Story mode if you want your family in the memory.$body$,
    NULL, NULL,
    'Lake Merritt then-and-now public space comparison',
    NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":"https://commons.wikimedia.org/wiki/Special:FilePath/Lake%20Merritt%2C%20Oakland%2C%20California-LCCN2008678131.jpg","timeTravelCaption":"Historical reference: Lake Merritt, Oakland, California. Photochrom Print Collection, Library of Congress via Wikimedia Commons.","timeTravelOpacity":0.46}$meta$::jsonb,
    $body$A then/now photo is a quiet question. The lake didn't change much; the city around it changed everything. The Panthers grew up here because Oakland had grown up around a broken promise — that public space and public care would be for everyone. Their answer was simple: if the city won't feed our kids, we will.$body$
  );

  -- Step 7: Imagine forward (drawing)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 6, 'Imagine forward', 37.8044, -122.2595,
    '666 Bellevue Avenue, Oakland, CA 94610',
    $body$Find a bench. The Panthers ran more than 60 "survival programs" — free breakfast, free clinics, free shoes, a free ambulance, a free school, free legal aid, sickle cell testing, transport to visit jailed family. If you started a survival program for kids in YOUR city today, what would it be? Draw it.$body$,
    $body$Don't guide the answer. Whatever the kid draws — pet food, free haircuts, hot lunch, a phone-charging bench — is data about what they think is broken and how care could fix it.$body$,
    'drawing',
    'Draw one survival program you would start for kids today.',
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":"A kid-friendly community program idea inspired by the Panthers","timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$The Panthers ran more than 60 community programs by the mid-1970s. Not all of them worked. Many of them did. The lesson FamActify keeps coming back to: care is concrete. It looks like food at 7 AM, a doctor on the corner, a school that knows your name. Anyone can start one. Most cities are waiting for someone to.$body$
  );

  -- Step 8: Family community time capsule (text reflection)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 7, 'Family community time capsule', NULL, NULL, NULL,
    $body$One last step. Find a quiet spot — the bench, a tree, the car ride home. Think of ONE person in your family or street who takes care of others in an ordinary, unfamous way. A grandparent who feeds neighbours. A coach who shows up early. A neighbour who watches everyone's mail. Type one sentence about them.$body$,
    $body$If a grandparent isn't with you, this is a perfect moment to call them right now. Ask: "Who in our family taught you what care looks like?" Their answer is the time capsule.$body$,
    'text',
    $body$Write one sentence for the family time capsule: "In our family, care worth remembering is…"$body$,
    NULL,
    '[]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$The Panthers were teenagers when they started. Bobby Hutton was 16. Elaine Brown was 25 when she joined. The lesson they leave is not "everyone has to start a Party." It's simpler: care is the unit. Today you named one. The future will remember it because you did.$body$
  );

END $panther$;


-- ═══════════════════════════════════════════════════════════════
-- 3) LAKE MERRITT LAKESHORE EVENING (light companion CityGame)
-- ═══════════════════════════════════════════════════════════════
DO $lake$
DECLARE
  hunt_uuid uuid;
BEGIN
  INSERT INTO public.hunts (
    slug, title, blurb, cover_emoji, host_name, city, country_code,
    primary_theme, age_min, age_max, duration_minutes, difficulty,
    est_cost_cents, distance_meters, credits, source_links,
    generation_notes, status, visibility, published_at,
    artifact_kind, artifact_version, created_via, created_by
  ) VALUES (
    'oakland-lake-merritt-lakeshore-evening',
    'Lake Merritt Lakeshore Evening City Game',
    $body$A short Oakland evening walk around Lake Merritt: old civic beauty, shared public space, birds, boats, and one question — what makes a place feel like community?$body$,
    '🌅',
    'FamActify Original',
    'Oakland',
    'US',
    'community', 6, 14, 45, 'easy', 0, 1900,
    $body$Companion to the Oakland Black Panther Community Power City Game. Same lake, lighter pace — designed as a relaxed family evening walk in the Brockton CityGames spirit: notice ordinary public life.$body$,
    ARRAY[
      'https://lakemerrittinstitute.org/about-lake-merritt/',
      'https://www.lakemerritt.org/',
      'https://clevelandcascade.org/wp/history-2/origins/',
      'https://localwiki.org/oakland/Oakland_Pergola_and_Colonnade',
      'https://www.oaklandca.gov/Community/Parks-Facilities/Recreation-Centers/Lake-Merritt-Sailboat-House',
      'https://commons.wikimedia.org/wiki/File:Lake_Merritt,_Oakland,_California-LCCN2008678131.jpg'
    ]::text[],
    $body$CityGame v1 polish (2026-05-10): copy tightened to be kid-actionable rather than guide-book-like; reveals lead with the concrete year/name (1870 refuge, 1923 Cascade designer Howard Gilkey, 1913 Pergola & Colonnade); parentHints now contain literal sentences to say aloud. Light hunt — keep it 45 min, no time capsule (the Black Panther CityGame is the deep version of this lake).$body$,
    'published', 'public', '2026-05-08T00:00:00Z',
    'scavenger_hunt', 1, 'human', NULL
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title, blurb = EXCLUDED.blurb, cover_emoji = EXCLUDED.cover_emoji,
    host_name = EXCLUDED.host_name, city = EXCLUDED.city, country_code = EXCLUDED.country_code,
    primary_theme = EXCLUDED.primary_theme, age_min = EXCLUDED.age_min, age_max = EXCLUDED.age_max,
    duration_minutes = EXCLUDED.duration_minutes, difficulty = EXCLUDED.difficulty,
    est_cost_cents = EXCLUDED.est_cost_cents, distance_meters = EXCLUDED.distance_meters,
    credits = EXCLUDED.credits, source_links = EXCLUDED.source_links,
    generation_notes = EXCLUDED.generation_notes, status = EXCLUDED.status,
    visibility = EXCLUDED.visibility, published_at = EXCLUDED.published_at,
    updated_at = now()
  RETURNING id INTO hunt_uuid;

  DELETE FROM public.hunt_stops WHERE hunt_id = hunt_uuid;

  -- Step 1: Then / now (time_travel_photo)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 0, 'Then / now: what is a postcard worth of city?', 37.8106, -122.2529,
    'Lakeshore Avenue near El Embarcadero, Oakland, CA',
    $body$Start with the memory-maker. Hold up an old Lake Merritt postcard image against today's water. What stayed? What's gone? Who shows up in the old picture, and who's walking past you now?$body$,
    $body$Try asking: "When a city made a postcard back then, what did they want strangers to see? What would today's postcard look like — and who would be in it?"$body$,
    'time_travel_photo',
    $body$Take a now + history photo: line up the old Lake Merritt image with today's lake edge. Use Full Story mode for a family selfie.$body$,
    NULL, NULL,
    'Lake Merritt then-and-now comparison',
    NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":"https://commons.wikimedia.org/wiki/Special:FilePath/Lake%20Merritt%2C%20Oakland%2C%20California-LCCN2008678131.jpg","timeTravelCaption":"Historical reference: Lake Merritt, Oakland, California. Photochrom Print Collection, Library of Congress via Wikimedia Commons.","timeTravelOpacity":0.46}$meta$::jsonb,
    $body$Old civic postcards are sneaky little time machines. They show what a city wanted to be proud of, on purpose. The lake itself barely changed in 100 years. The people walking around it did — and that's how you can tell whose city it really was, and whose city it is now.$body$
  );

  -- Step 2: Cleveland Cascade (photo)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 1, 'Cleveland Cascade — water as decoration', 37.81, -122.2479,
    'Cleveland Cascade, Lakeshore Avenue & Cleveland Street, Oakland, CA',
    $body$Find the old stone stairs above Lakeshore. Walk only as far up as feels safe, then turn around and look back at the lake. This isn't just exercise. A landscape architect designed all of this — terraces, bowls, lights — to make a city walk into a small civic gift.$body$,
    $body$Try asking: "Why would a city build a beautiful stairway here instead of just a plain sidewalk? Who is something this pretty FOR?"$body$,
    'photo',
    $body$Take a photo of the stairs, a detail, or the lake view that feels like "old Oakland civic pride."$body$,
    NULL, NULL,
    'Cleveland Cascade stairs, detail, or Lake Merritt view',
    NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$The Cleveland Cascade was designed in 1923 by Howard Gilkey — an Italian-Renaissance-inspired waterfall with twenty illuminated tiers running down to the lake. It fell apart for decades. Then in 2004 neighbours organised, raised money, and brought it back. That's civic care, two generations apart.$body$
  );

  -- Step 3: Walk the edge (audio)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 2, 'Walk the edge — who else is here?', 37.8106, -122.2529,
    'Lakeshore Avenue near El Embarcadero, Oakland, CA',
    $body$Walk along the lake edge for a minute. Now stop. Look for three signs that this is shared space: someone running, someone resting on a bench, a stroller, a dog, music in the air, a fishing pole, a couple kissing, a kid drawing.$body$,
    $body$Try asking: "What makes a place feel like it belongs to everybody?" Listen first — the answer is usually a quieter version of "people are different and nobody's being chased away."$body$,
    'audio',
    'Record 6 seconds of Lake Merritt evening sound — water, birds, footsteps, voices in the distance, or wind.',
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":"Lake Merritt evening ambience: water, birds, footsteps, voices, wind","audioMaxSeconds":6,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$Lake Merritt is technically a tidal lagoon — saltwater from the Bay, breathing in and out twice a day. That's why you might hear gulls instead of just ducks, and why the water has a faint sea smell. It's the Pacific Ocean, taking a walk into downtown Oakland.$body$
  );

  -- Step 4: Pergola (drawing)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 3, 'Pergola — when columns frame a lake', 37.811, -122.2554,
    '599 El Embarcadero, Oakland, CA',
    $body$Find the columns by the lake. Stand where the white columns frame the water like a giant picture frame. This was built when the city wanted to turn an ordinary lake view into something you stop and look at.$body$,
    $body$Try asking: "How does the same lake feel different when you look at it through these columns? What changes when architecture says 'look here'?"$body$,
    'drawing',
    'Draw the simplest shape you see — a column, arch, shadow, the lake line, or the frame around the view.',
    NULL, NULL, NULL, NULL,
    $meta${"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":"Column, arch, shadow, lake line, or framed lake view","timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}$meta$::jsonb,
    $body$The Lake Merritt Pergola and Colonnade was built in 1913 as part of Oakland's "City Beautiful" push — a national movement that said even an ordinary lake deserves columns, gardens, and a frame. It's been a wedding-photo backdrop for a hundred years.$body$
  );

  -- Step 5: Refuge (observation)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 4, 'Refuge — care that has feathers', 37.8078, -122.2592,
    '600 Bellevue Avenue, Oakland, CA',
    $body$Slow down near the bird-refuge area. Look for two refuge clues: a bird on the water, an island, a sign about wildlife, a feather, water moving the wrong way, or someone watching very quietly.$body$,
    $body$Try asking: "If a city decides this water is FOR the birds, what is the city saying about what counts as community?"$body$,
    'observation',
    'Notice two refuge clues: a bird, sign, island, water movement, feather, nest area, or person watching quietly.',
    NULL, NULL, NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$In 1870, California declared Lake Merritt a wildlife refuge — the first official wildlife refuge in the United States. That decision is now 156 years old. Every duck and pelican you see is still being protected by a law older than your great-great-grandparents.$body$
  );

  -- Step 6: Boats (multiple choice)
  INSERT INTO public.hunt_stops (
    hunt_id, stop_order, title, lat, lon, address, clue_text, parent_hint,
    prompt_kind, prompt_question, prompt_options, prompt_correct,
    prompt_photo_subject, prompt_reference_image, prompt_metadata, reveal_fun_fact
  ) VALUES (
    hunt_uuid, 5, 'Boats — a lake you can DO', 37.8064, -122.2586,
    '568 Bellevue Avenue, Oakland, CA',
    $body$End near the boating center. Look at the boats, ropes, docks, ripples, the way the water moves. The lake isn't only something to look at — it's something people DO. Last question.$body$,
    $body$Try asking: "What would make you want to come back here? Boats, birds, a drawing book, a picnic, a friend?" The answer is the seed of a family tradition.$body$,
    'multiple_choice',
    'What kind of water is Lake Merritt?',
    '["A tidal lagoon connected to the Bay","A mountain lake","A swimming pool","A river waterfall"]'::jsonb,
    '["A tidal lagoon connected to the Bay"]'::jsonb,
    NULL, NULL,
    '{"audioSubject":null,"audioMaxSeconds":null,"drawingSubject":null,"timeTravelImageUrl":null,"timeTravelCaption":null,"timeTravelOpacity":null}'::jsonb,
    $body$Lake Merritt is many places at once: tidal lagoon, wildlife refuge, walking loop, boating place, sunset view, wedding backdrop, breakfast spot for thousands of birds, and Oakland's public living room. The trick of a good city is having one place that's allowed to be all of those things at once.$body$
  );

END $lake$;


-- ═══════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache so admin/hunts sees fresh data
-- ═══════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
