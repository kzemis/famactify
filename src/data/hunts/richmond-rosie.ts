import type { ScavengerHunt } from '@/types/hunt';

// CG-01 — Richmond Rosie the Riveter CityGame.
// Source brief: ~/knowledge/famactify/docs/product/citygames/CG-01-richmond-rosie-focus-brief.md
// CityGame question: "How did war work change women, families, and a city?"
// Three dimensions (encoded as code comments — no schema change yet):
//   Dim 1 — Icon vs Real Workers          (steps 1, 2, 3)
//   Dim 2 — Ships, Speed, and Work        (steps 4, 5, 6)
//   Dim 3 — Memory and Family             (steps 7, 8)

const shipyardTimeTravelImageUrl =
  'https://upload.wikimedia.org/wikipedia/commons/c/c6/Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg';
const rosiePortraitTimelineImageUrl =
  'https://ca-times.brightspotcdn.com/dims4/default/9ce7182/2147483647/strip/true/crop/817x1024+0+0/resize/1200x1504!/format/webp/quality/75/?url=https%3A%2F%2Fcalifornia-times-brightspot.s3.amazonaws.com%2F01%2F82%2F9f987139a3227dfa0c013a3fbb12%2Fla-me-c1-rosie-riveter-pictures-005';

export const richmondRosie: ScavengerHunt = {
  id: 'richmond-rosie',
  slug: 'richmond-rosie-the-riveter',
  title: 'Rosie the Riveter — Richmond Home Front City Game',
  blurb:
    'How did war work change women, families, and a city? Walk Richmond\'s WWII waterfront, meet the real people behind Rosie, and make your own family memory.',
  coverEmoji: '💪',
  hostName: 'FamActify Original',
  city: 'Richmond',
  countryCode: 'US',
  primaryTheme: 'history',
  ageMin: 8,
  ageMax: 14,
  durationMinutes: 180,
  difficulty: 'medium',
  estCostCents: 0,
  distanceMeters: 3500,
  publishedAt: '2026-05-02',
  credits:
    'Anchored on Rosie the Riveter / WWII Home Front National Historical Park (NPS). Inspired by David Riemer\'s Brockton CityGames philosophy: history is everyday people, their jobs, and lives.',
  sourceLinks: [
    'https://www.nps.gov/rori/index.htm',
    'https://www.nps.gov/rori/learn/historyculture/who-was-rosie-the-riveter.htm',
    'https://www.nps.gov/rori/learn/historyculture/historic-richmond-shipyards.htm',
    'https://www.nps.gov/places/rosie-the-riveter-visitor-education-center.htm',
    'https://www.nps.gov/places/ss-red-oak-victory-ship.htm',
    'https://www.nps.gov/rori/planyourvisit/rosie-the-riveter-memorial.htm',
    'https://www.nytimes.com/2018/01/22/obituaries/naomi-parker-fraley-the-real-rosie-the-riveter-dies-at-96.html',
    'https://www.smithsonianmag.com/history/myth-rosie-the-riveter-180954625/',
    'https://commons.wikimedia.org/wiki/File:Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg',
    rosiePortraitTimelineImageUrl,
  ],
  generationNotes:
    'CityGame v1 polish (2026-05-09): copy tightened to be kid-actionable rather than museum-like; reveals lead with the surprising specific (95-year-old Naomi, 90,000 migrants, 747 ships, 4d-15h-26m record); parentHints now include literal sentences a parent can say aloud; final time capsule reveal mirrors back the Rosie arc. All facts are anchored in NPS / Smithsonian / NYT sources listed above. Field-verify exact walking order, current access, and best camera angle before publishing broadly. The Rosie portrait timeline image is a user-provided LA Times CDN URL; verify usage rights or replace with a licensed/public-domain source before broad public release.',
  stops: [
    // ── Dimension 1 — Icon vs Real Workers ───────────────────────────────
    {
      id: 'rosie-visitor-center-poster',
      order: 0,
      title: 'The poster: was Rosie real?',
      lat: 37.9032,
      lon: -122.3659,
      address: '1414 Harbour Way South #3000, Richmond, CA 94804',
      clueText:
        'Step inside the Visitor Education Center. Find the famous "We Can Do It!" poster — small, blue, yellow, with a woman in a red polka-dot bandana flexing her arm. Look at her face for ten whole seconds before you answer. Was she one real person, or a stand-in for millions?',
      parentHint:
        'Try asking out loud: "When ONE picture becomes famous for MILLIONS of people, whose names get lost?" Let the kid sit with that.',
      prompt: {
        kind: 'multiple_choice',
        question:
          'Who is now believed to be the real-life inspiration behind the "We Can Do It!" poster?',
        options: [
          'Naomi Parker Fraley',
          'Geraldine Hoff Doyle',
          'Rose Will Monroe',
          'Mary Keefe',
        ],
        correctAnswers: ['Naomi Parker Fraley'],
      },
      reveal: {
        funFact:
          'For seventy years no one was sure who the real woman in the poster was. In 2016 a researcher proved it was Naomi Parker Fraley — a riveter at Naval Air Station Alameda, right across the Bay. She was 95 years old when she found out. She lived just long enough to see her own face on T-shirts, mugs, and history books before she passed away in 2018.',
      },
    },
    {
      id: 'rosie-portrait-full-story',
      order: 1,
      title: 'Rosie then / you now',
      lat: 37.9032,
      lon: -122.3659,
      address: '1414 Harbour Way South #3000, Richmond, CA 94804',
      clueText:
        'Stay near the story walls inside the Visitor Center. The poster is the icon — now make the icon part of YOUR family\'s memory. Open Full Story mode and capture three layers in one photo: today\'s wall, the old Rosie reference, and your family\'s face beside her.',
      parentHint:
        'Use Full Story mode so the saved memory shows today\'s place + the old Rosie image + your selfie. Don\'t worry about copying her pose — the point is "we were here, we saw her, we remembered."',
      prompt: {
        kind: 'time_travel_photo',
        question:
          'Create a Full Story timeline photo: today\'s place, the old Rosie reference, and your selfie — all in one frame.',
        photoSubject: 'Rosie reference image with today\'s Visitor Center memory and selfie',
        timeTravelImageUrl: rosiePortraitTimelineImageUrl,
        timeTravelCaption:
          'Rosie/Riveter reference image provided by user via Los Angeles Times CDN. Rights must be verified or replaced with a licensed source before public release.',
        timeTravelOpacity: 0.5,
      },
      reveal: {
        funFact:
          'The poster was never the point. The point is the question it asks YOU: whose work do you want to be remembered? Your photo just answered, "ours."',
      },
    },
    {
      id: 'rosie-real-workers-grounding',
      order: 2,
      title: 'Find the people behind the poster',
      lat: 37.9032,
      lon: -122.3659,
      address: '1414 Harbour Way South #3000, Richmond, CA 94804',
      clueText:
        'Rosie was a symbol — but this whole building is full of REAL people. Go hunting for three things you can point to: one worker\'s face you\'d recognise tomorrow, one tool you\'ve never held in your life, and one word that surprises you (like "rivet," "swing-shift," or "child-care center").',
      parentHint:
        'This is the "make history human" stop. After they spot their three things, ask: "If one of these faces looked like our family, what would their day have been like?"',
      prompt: {
        kind: 'observation',
        question:
          'Find three clues that show real wartime workers and families were here: one face, one object, and one word.',
      },
      reveal: {
        funFact:
          'More than 90,000 people moved to Richmond in just four years for shipyard work — Black families leaving the South, white families leaving Oklahoma, women who had never held a paying job. Schools doubled. Houses went up overnight. Child-care centers opened around the clock so mothers could work night shifts. A small town became a city in the time it takes a kid to grow from kindergarten to fourth grade.',
      },
    },

    // ── Dimension 2 — Ships, Speed, and Work ─────────────────────────────
    {
      id: 'rosie-shipyard-time-travel',
      order: 3,
      title: 'Shipyard then / waterfront now',
      lat: 37.9032,
      lon: -122.3659,
      address: 'Ford Point / Craneway waterfront, near the Visitor Education Center',
      clueText:
        'Step outside toward the water. Close your eyes for three seconds and imagine 90,000 people walking past, three shifts a day, every day, building ships. Now open them. Hold up the old shipyard image against today\'s quiet waterfront. What\'s gone? What\'s still here? Where would all those workers have lived?',
      parentHint:
        'Don\'t stress about lining up the photo perfectly. The conversation while you do it matters more than a clean overlay.',
      prompt: {
        kind: 'time_travel_photo',
        question:
          'Take a timeline photo: line up the old shipbuilding image with today\'s waterfront. Use Full Story mode if you want your selfie in the memory too.',
        photoSubject: 'Richmond shipyard then-and-now comparison',
        timeTravelImageUrl: shipyardTimeTravelImageUrl,
        timeTravelCaption:
          'Liberty ship section being moved at Richmond Shipyard No. 2 during WWII. Public-domain image via Wikimedia Commons / Imperial War Museums.',
        timeTravelOpacity: 0.48,
      },
      reveal: {
        funFact:
          'Richmond didn\'t build ships the slow old way — workers built giant sections separately, then welded them together like a city-sized puzzle. The record-breaker, the SS Robert E. Peary, was launched 4 days, 15 hours, and 26 minutes after its first piece was laid down. Most of the welders were women.',
      },
    },
    {
      id: 'red-oak-victory-sound',
      order: 4,
      title: 'SS Red Oak Victory: what did work sound like?',
      lat: 37.917,
      lon: -122.3603,
      address: '1337 Canal Boulevard, Richmond, CA 94804',
      clueText:
        'Find the Red Oak Victory — the LAST surviving ship built in Richmond\'s Kaiser shipyards. Stand close. Close your eyes for three seconds and imagine cranes, welding sparks, hammers, voices in a dozen languages, water hitting metal. Then press record.',
      parentHint:
        'If the ship is closed today (it usually opens Sundays), the harbour near the Visitor Center works just as well. The point is to feel scale through your ears, not just read it on a sign.',
      prompt: {
        kind: 'audio',
        question:
          'Record 5 seconds of harbour or shipyard sound — wind, water, footsteps, or your own "clang clang" shipbuilding sound.',
        audioSubject: 'Harbour, wind, water, footsteps, or a pretend shipbuilding clang',
        audioMaxSeconds: 5,
      },
      reveal: {
        funFact:
          'Richmond\'s four Kaiser shipyards built 747 ships during WWII — more than any shipyard complex in WORLD HISTORY. The Red Oak Victory is the only one of those 747 still here. Volunteers keep her alive the way grandparents keep stories alive: one weekend at a time.',
      },
    },
    {
      id: 'rosie-memorial-draw-the-work',
      order: 5,
      title: 'Rosie Memorial: draw the work',
      lat: 37.9072,
      lon: -122.3611,
      address: 'Marina Bay Park, 1900 Esplanade Drive, Richmond, CA 94804',
      clueText:
        'Walk the Rosie the Riveter Memorial. The walkway is the length of a real Liberty ship\'s keel — 441 feet — and it points toward the Bay. Find one shape: a name on the timeline, a quote on the white granite, a steel curve like a hull, a worker\'s tool. Pick one and draw it.',
      parentHint:
        'Ask: "Why a SHIP shape? Why not a statue of a person? What does that say about how women\'s work usually gets remembered — or doesn\'t?"',
      prompt: {
        kind: 'drawing',
        question:
          'Draw the outline of a Liberty ship, a rivet, a timeline mark, a worker tool, or one shape you notice at the memorial.',
        drawingSubject: 'A Liberty ship outline, rivet, timeline mark, worker tool, or memorial shape',
      },
      reveal: {
        funFact:
          'Most monuments honour leaders or soldiers. This one honours the welder, the riveter, the mom who fed her kids before her shift, the grandmother who learned to drive a forklift at fifty. The walkway lines up with the Golden Gate Bridge — and the timeline panels carry the workers\' OWN words, not a politician\'s.',
      },
    },

    // ── Dimension 3 — Memory and Family ──────────────────────────────────
    {
      id: 'rosie-pose-memory-photo',
      order: 6,
      title: 'Make your own Rosie memory',
      lat: 37.9072,
      lon: -122.3611,
      address: 'Rosie the Riveter Memorial, Marina Bay Park',
      clueText:
        'End the walk with a photo. Roll up your sleeve. Make a fist. Give your best "We Can Do It!" face. OR — invent your own pose. What does strength look like in YOUR family? (Yes, grown-ups too. Especially grown-ups.)',
      parentHint:
        'Keep it playful. If the kid feels shy, let them photograph YOU doing the pose first. The point is a real family memory, not a perfect copy of a poster.',
      prompt: {
        kind: 'photo',
        question:
          'Take a Rosie-pose or family-strength photo together to remember the city game.',
        photoSubject: 'Rosie pose, family work pose, or "we can do it" memory',
      },
      reveal: {
        funFact:
          'The "We Can Do It!" poster was barely seen during WWII — Westinghouse hung it inside their factories for two weeks in 1943, then took it down. It sat forgotten for forty years. It became famous in the 1980s, decades after Rosie\'s real generation had retired and grown grey. Sometimes the symbol arrives long after the work.',
      },
    },
    {
      id: 'rosie-family-time-capsule',
      order: 7,
      title: 'Family time capsule',
      lat: null,
      lon: null,
      clueText:
        'One last step. Find a bench, a quiet patch of grass, or just stand together. Think of ONE person in your family — past or present — whose work matters but isn\'t famous. A grandmother who raised five kids. An uncle who fixes everyone\'s cars. A parent who packs lunches at 6 AM. Type one sentence about them.',
      parentHint:
        'If a grandparent isn\'t with you, this is a good moment to call them right now. Ask: "What\'s one thing about your work I should know?" Their answer is the time capsule.',
      prompt: {
        kind: 'text',
        question:
          'Write one sentence for the family time capsule: "In our family, work worth remembering is…"',
        correctAnswers: [],
      },
      reveal: {
        funFact:
          'Naomi Parker Fraley wasn\'t famous until she was 95. The women of Richmond\'s shipyards weren\'t called heroes when they were young — they were called "Mrs." and "Ma\'am" and went home to cook dinner. Memory is the gift you give the future. Today you gave one.',
      },
    },
  ],
};
