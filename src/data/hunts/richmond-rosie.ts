import type { ScavengerHunt } from '@/types/hunt';

const shipyardTimeTravelImageUrl =
  'https://upload.wikimedia.org/wikipedia/commons/c/c6/Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg';

export const richmondRosie: ScavengerHunt = {
  id: 'richmond-rosie',
  slug: 'richmond-rosie-the-riveter',
  title: 'Rosie the Riveter — Richmond Home Front Hunt',
  blurb:
    'How did war work change women, families, and a city? Walk Richmond’s WWII waterfront, meet the real people behind Rosie, and make your own family memory.',
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
    'Anchored on Rosie the Riveter / WWII Home Front National Historical Park (NPS). Inspired by David Riemer’s Brockton CityGames philosophy: history is everyday people, their jobs, and lives.',
  sourceLinks: [
    'https://www.nps.gov/rori/index.htm',
    'https://www.nps.gov/rori/learn/historyculture/who-was-rosie-the-riveter.htm',
    'https://www.nps.gov/rori/learn/historyculture/historic-richmond-shipyards.htm',
    'https://www.nps.gov/places/rosie-the-riveter-visitor-education-center.htm',
    'https://www.nps.gov/places/ss-red-oak-victory-ship.htm',
    'https://www.nps.gov/rori/planyourvisit/rosie-the-riveter-memorial.htm',
    'https://commons.wikimedia.org/wiki/File:Shipbuilding_in_the_Kaiser_Shipyards_in_the_USA_during_the_Second_World_War_A12090.jpg',
  ],
  generationNotes:
    'CityGame v1 seed update: focuses on the question “How did war work change women, families, and a city?” Uses existing prompt kinds only: multiple_choice, observation, time_travel_photo, audio, drawing, photo, and text. Field-verify exact walking order, current access, and best camera angle before publishing broadly.',
  stops: [
    {
      id: 'rosie-visitor-center-poster',
      order: 0,
      title: 'The poster: was Rosie real?',
      lat: 37.9032,
      lon: -122.3659,
      address: '1414 Harbour Way South #3000, Richmond, CA 94804',
      clueText:
        'Start inside the Visitor Education Center. Find the famous “We Can Do It!” poster. Look closely before answering: was Rosie one real person, or a symbol for many people?',
      parentHint:
        'Ask: when one poster becomes famous, whose names can disappear behind the symbol?',
      prompt: {
        kind: 'multiple_choice',
        question:
          'Who is now believed to be the real-life inspiration behind the “We Can Do It!” poster?',
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
          '“Rosie the Riveter” was never only one person. She became a symbol for millions of women who took factory, shipyard, and defense jobs during WWII. Naomi Parker Fraley worked at Naval Air Station Alameda and is now widely linked to the “We Can Do It!” poster.',
      },
    },
    {
      id: 'rosie-real-workers-grounding',
      order: 1,
      title: 'Real workers, real families',
      lat: 37.9032,
      lon: -122.3659,
      address: '1414 Harbour Way South #3000, Richmond, CA 94804',
      clueText:
        'The poster is only the doorway. Now hunt for real life: one worker face, one object or tool, and one word about family, migration, childcare, housing, or work.',
      parentHint:
        'This is the “make history human” stop. Ask what feels more real than the poster: a face, a tool, a map, a lunchbox, a child-care story, or a worker name.',
      prompt: {
        kind: 'observation',
        question:
          'Find three clues that show real wartime workers and families were here: one face, one object, and one word.',
      },
      reveal: {
        funFact:
          'Richmond grew fast during WWII because work pulled people here. Families moved, schools and housing changed, child-care centers mattered, and women took jobs that many people had said were “not women’s work.”',
      },
    },
    {
      id: 'rosie-shipyard-time-travel',
      order: 2,
      title: 'Shipyard then / waterfront now',
      lat: 37.9032,
      lon: -122.3659,
      address: 'Ford Point / Craneway waterfront, near the Visitor Education Center',
      clueText:
        'Step outside toward the waterfront. Hold up the old Richmond shipyard image and compare it with today: what stayed industrial, what became quiet, and where would thousands of workers have moved?',
      parentHint:
        'Use “Full Story” mode if possible so the final memory includes today’s place, the historical shipyard image, and a selfie. Exact alignment is less important than noticing what changed.',
      prompt: {
        kind: 'time_travel_photo',
        question:
          'Take a timeline photo: line up the old shipbuilding image with today’s waterfront, then use Full Story mode if you want your selfie in the memory.',
        photoSubject: 'Richmond shipyard then-and-now comparison',
        timeTravelImageUrl: shipyardTimeTravelImageUrl,
        timeTravelCaption:
          'Liberty ship section being moved at Richmond Shipyard No. 2 during WWII. Public-domain image via Wikimedia Commons / Imperial War Museums.',
        timeTravelOpacity: 0.48,
      },
      reveal: {
        funFact:
          'Richmond’s shipyards did not build one ship at a time in the old slow way. Workers built big sections separately, moved them with cranes, and assembled ships fast — like a city-sized puzzle.',
      },
    },
    {
      id: 'red-oak-victory-sound',
      order: 3,
      title: 'SS Red Oak Victory: what did work sound like?',
      lat: 37.917,
      lon: -122.3603,
      address: '1337 Canal Boulevard, Richmond, CA 94804',
      clueText:
        'Find the Red Oak Victory — a real cargo ship built here in 1944. Pause and listen. Imagine cranes, welding, footsteps, voices, water, and metal.',
      parentHint:
        'If the ship area is closed or too far today, use the waterfront soundscape near the visitor center and talk about what the working shipyard might have sounded like.',
      prompt: {
        kind: 'audio',
        question:
          'Record 5 seconds of harbor or shipyard sound — wind, water, footsteps, or your own “clang clang” shipbuilding sound.',
        audioSubject: 'Harbor, wind, water, footsteps, or a pretend shipbuilding clang',
        audioMaxSeconds: 5,
      },
      reveal: {
        funFact:
          'The four Richmond Kaiser shipyards built 747 ships during WWII — more than any other shipyard complex in the world. Richmond became a place where speed, work, migration, and family life all collided.',
      },
    },
    {
      id: 'rosie-memorial-draw-the-work',
      order: 4,
      title: 'Rosie Memorial: draw the work',
      lat: 37.9072,
      lon: -122.3611,
      address: 'Marina Bay Park, 1900 Esplanade Drive, Richmond, CA 94804',
      clueText:
        'Walk the Rosie the Riveter Memorial. It is shaped like a Liberty ship under construction. Look for lines, names, dates, and forms that make work visible.',
      parentHint:
        'Ask: why would a memorial to women’s work be shaped like a ship? What kind of work usually gets monuments, and what kind does not?',
      prompt: {
        kind: 'drawing',
        question:
          'Draw the outline of a Liberty ship, a rivet, a timeline mark, a worker tool, or one shape you notice at the memorial.',
        drawingSubject: 'A Liberty ship outline, rivet, timeline mark, worker tool, or memorial shape',
      },
      reveal: {
        funFact:
          'The Rosie Memorial was created to honor women’s labor on the Home Front. Its walkway is the length of a ship’s keel and points toward the Bay, turning industrial work into a place for memory.',
      },
    },
    {
      id: 'rosie-pose-memory-photo',
      order: 5,
      title: 'Make your own Rosie memory',
      lat: 37.9072,
      lon: -122.3611,
      address: 'Rosie the Riveter Memorial, Marina Bay Park',
      clueText:
        'End the place-walk with a photo. You can do the classic Rosie arm pose, or invent a pose for “work worth remembering” in your own family.',
      parentHint:
        'Keep it playful. The point is not copying the poster perfectly — it is turning the icon into a family memory.',
      prompt: {
        kind: 'photo',
        question:
          'Take a Rosie-pose or family-work photo together to remember the hunt.',
        photoSubject: 'Rosie pose, family work pose, or “we can do it” memory',
      },
      reveal: {
        funFact:
          'The “We Can Do It!” poster was not famous during WWII. It was rediscovered decades later and became a symbol of women’s empowerment long after the wartime workers had changed the country.',
      },
    },
    {
      id: 'rosie-family-time-capsule',
      order: 6,
      title: 'Family time capsule',
      lat: null,
      lon: null,
      clueText:
        'Before you leave, connect Richmond’s work story to your own family. Think of one job, skill, migration story, caregiving task, or ordinary act that deserves to be remembered.',
      parentHint:
        'This is the Brockton CityGame-style ending: history becomes personal. Ask the child what future kids should know about today’s family work.',
      prompt: {
        kind: 'text',
        question:
          'Write one sentence for a family time capsule: “In our family, work worth remembering is…”',
        correctAnswers: [],
      },
      reveal: {
        funFact:
          'A city is not only buildings and dates. It is people solving practical problems: earning money, caring for children, moving for work, learning skills, and making something together.',
      },
    },
  ],
};
