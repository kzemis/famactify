import type { ScavengerHunt } from '@/types/hunt';

// CG-02 — Oakland Black Panther Community Power CityGame.
// Source brief: ~/knowledge/famactify/docs/product/citygames/CG-02-oakland-black-panther.md
// CityGame question: "How did Oakland kids and neighbours organize to take care of each other?"
// Three dimensions (encoded as code comments — no schema change yet):
//   Dim 1 — Where it Started              (steps 1, 2)
//   Dim 2 — Care as Power                 (steps 3, 4)
//   Dim 3 — Community Today / Memory      (steps 5, 6, 7, 8)

export const oaklandBlackPanther: ScavengerHunt = {
  id: 'oakland-black-panther',
  slug: 'oakland-black-panther-heritage',
  title: 'Oakland Black Panther Community Power City Game',
  blurb:
    'How did Oakland kids and neighbours organize to take care of each other? A respectful family walk through the West Oakland places where the Black Panther Party was born — and where its breakfast, school, and clinic ideas still echo today.',
  coverEmoji: '🐆',
  hostName: 'FamActify Original',
  city: 'Oakland',
  countryCode: 'US',
  primaryTheme: 'history',
  ageMin: 9,
  ageMax: 16,
  durationMinutes: 150,
  difficulty: 'medium',
  estCostCents: 0,
  distanceMeters: 4500,
  publishedAt: '2026-05-02',
  credits:
    'Inspired by David Riemer\'s 1982 Brockton CityGames philosophy: history is everyday people, their homes, jobs, and lives. Please walk respectfully — these are real neighbourhoods where real families still live.',
  sourceLinks: [
    'https://en.wikipedia.org/wiki/Black_Panther_Party',
    'https://en.wikipedia.org/wiki/Free_Breakfast_for_Children',
    'https://en.wikipedia.org/wiki/Bobby_Hutton',
    'https://en.wikipedia.org/wiki/Elaine_Brown',
    'https://en.wikipedia.org/wiki/Ericka_Huggins',
    'https://www.visitoakland.com/listing/west-oakland-mural-project/6280/',
    'https://home.nps.gov/articles/000/the-west-oakland-mural-project-oakland-california.htm',
    'https://lakemerrittinstitute.org/about-lake-merritt/',
    'https://commons.wikimedia.org/wiki/File:Lake_Merritt,_Oakland,_California-LCCN2008678131.jpg',
  ],
  generationNotes:
    'CityGame v1 polish (2026-05-10): copy tightened to be kid-actionable; reveals lead with specific names + dates (Newton 24 / Seale 30 / Hutton 17 / Brown chair 1974–77 / Huggins Oakland Community School / FBI quote / 20,000 kids / NSBP 1975); parentHints now contain literal sentences to say aloud; added Step 8 family-community time capsule to mirror Rosie\'s arc. All facts are anchored in NPS / Wikipedia / Visit Oakland / Lake Merritt Institute sources listed above. Field-verify exact plaque wording, mural condition, and St. Augustine\'s signage before publishing broadly.',
  stops: [
    // ── Dimension 1 — Where it Started ───────────────────────────────────
    {
      id: 'merritt-college-historical-marker',
      order: 0,
      title: 'Why a panther?',
      lat: 37.803,
      lon: -122.2755,
      address: '5714 Martin Luther King Jr Way, Oakland, CA',
      clueText:
        'You\'re standing where it began. In October 1966, two students at this very campus — Huey Newton, 24, and Bobby Seale, 30 — wrote a list of ten demands for change. They needed a symbol. They picked an animal that, in Bobby\'s words, "doesn\'t strike first, but never backs down when it\'s cornered." Find the historical marker. Which animal?',
      parentHint:
        'Try asking: "Newton was 24. Seale was 30. By today\'s standards, how old is that? Old enough to start something this big?"',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which animal did Huey and Bobby choose for the party\'s name?',
        options: ['Black panther', 'Black eagle', 'Black bear', 'Black wolf'],
        correctAnswers: ['Black panther'],
      },
      reveal: {
        funFact:
          'The Black Panther Party for Self-Defense launched October 1966 with a 10-point program demanding decent housing, jobs, education, food, and an end to police brutality. Newton was 24. Seale was 30. They were barely older than the kids who\'d soon line up at dawn for the breakfasts the Panthers would cook.',
      },
    },
    {
      id: 'bobby-hutton-park',
      order: 1,
      title: 'First and youngest',
      lat: 37.8092,
      lon: -122.2895,
      address: '1651 Adeline Street, Oakland, CA 94607',
      clueText:
        'This park used to be called DeFremery. It was renamed in honour of Bobby Hutton — a 16-year-old who became the Panthers\' very first recruit and treasurer. He was killed by Oakland police at 17. Find the memorial marker and read his dates.',
      parentHint:
        'This stop is heavy. It\'s okay to pause. Try asking: "What does it mean that someone joined a movement before they were old enough to drive?"',
      prompt: {
        kind: 'text',
        question: 'How old was Bobby Hutton when he died? (Just type the number.)',
        correctAnswers: ['17', 'seventeen'],
      },
      reveal: {
        funFact:
          'Bobby Hutton was 16 when he became member #1. He died at 17 on April 6, 1968 — two days after Dr. King was killed in Memphis. DeFremery Park became a centre of Black community life: jazz, youth programs, Panther survival programs, family Sundays. Renaming the park made the memorial something you walk through, not just look at.',
      },
    },

    // ── Dimension 2 — Care as Power ──────────────────────────────────────
    {
      id: 'st-augustines-free-breakfast',
      order: 2,
      title: 'Breakfast as resistance',
      lat: 37.8155,
      lon: -122.2737,
      address: '525 29th Street, Oakland, CA 94609',
      clueText:
        'In January 1969, the Black Panthers started a program right here that fed thousands of kids before school — free, hot, every weekday morning. Eggs, grits, toast, hot chocolate. What did they call it? Say the name out loud, or make one welcoming breakfast sound.',
      parentHint:
        'Try asking: "How is feeding a hungry kid every morning before school a kind of political change?" The Panthers had a clear answer — see if your kid finds theirs.',
      prompt: {
        kind: 'audio',
        question:
          'Step aside safely and record 5 seconds — say "Free Breakfast for Children", or make one welcoming breakfast sound (pan, kettle, "good morning!").',
        audioSubject: 'The player saying Free Breakfast for Children, or a welcoming breakfast sound',
        audioMaxSeconds: 5,
      },
      reveal: {
        funFact:
          'At its peak the Panthers fed 20,000+ kids every weekday across the country. The FBI called the breakfast program "the greatest internal threat to national security." Six years later, in 1975, the federal government permanently expanded the National School Breakfast Program. Sometimes a thing the government calls a threat becomes a thing the government copies.',
      },
    },
    {
      id: 'women-black-panther-mural-photo',
      order: 3,
      title: 'Who led the Panthers?',
      lat: 37.8068,
      lon: -122.2948,
      address: '831 Center Street, Oakland, CA 94607',
      clueText:
        'Find a safe public view of the Women of the Black Panther Party mural. Stay on the sidewalk and look. Most history books show two men. By the mid-1970s, two out of every three Panthers were women. Find one face you\'d recognise tomorrow, one word painted big, one symbol of care.',
      parentHint:
        'Keep it respectful — this is public art on someone\'s neighbourhood. Try asking: "Whose face is missing from the famous photos? Why do you think that happened?"',
      prompt: {
        kind: 'photo',
        question:
          'Take a privacy-safe photo of one mural detail: a colour, face, word, raised hand, food basket, or care symbol. Avoid close-ups of bystanders.',
        photoSubject: 'Women of the Black Panther Party mural detail without close-up faces of bystanders',
      },
      reveal: {
        funFact:
          'By the mid-1970s, more than two-thirds of Black Panther members were women. Elaine Brown ran the entire Party as Chairwoman from 1974 to 1977. Ericka Huggins led the Oakland Community School — which California State Assembly called the best alternative school in the state. The poster icons get the men. This mural fixes that.',
      },
    },

    // ── Dimension 3 — Community Today / Memory ───────────────────────────
    {
      id: 'lake-merritt-grounding',
      order: 4,
      title: 'Arrive at the lake',
      lat: 37.8044,
      lon: -122.2595,
      address: '666 Bellevue Avenue, Oakland, CA 94610',
      clueText:
        'You\'re at Lake Merritt now — Oakland\'s public living room. Slow down. The Panthers ran their survival programs not far from here. Find two signs of community right now: people sharing space, birds using the water, a bench, a path, a meeting place.',
      parentHint:
        'This is a calm reset after heavy stops. Try asking: "What does this lake do for the city today? What does community mean if we\'re looking, not just reading?"',
      prompt: {
        kind: 'observation',
        question: 'Notice two clues that show this lake is a community place.',
      },
      reveal: {
        funFact:
          'Lake Merritt is a tidal lagoon — saltwater from the Bay, breathing in and out twice a day. It was declared a wildlife refuge in 1870, the first such refuge in the United States. A century before the Panthers fed kids here, the city had already decided this water and these birds belonged to everyone.',
      },
    },
    {
      id: 'lake-merritt-time-travel',
      order: 5,
      title: 'Then / now: who shared this lake?',
      lat: 37.8044,
      lon: -122.2595,
      address: 'Lake Merritt shoreline, Oakland, CA',
      clueText:
        'Hold up the old Lake Merritt image and compare with today. Look at who\'s in the historic photo, and who\'s walking past you now. What stayed? What changed? Who got to be in a city\'s "showplace" picture, and who got left out of the frame?',
      parentHint:
        'Try asking: "Old postcards show what a city wanted to be proud of. Who do you think was missing from the original picture?"',
      prompt: {
        kind: 'time_travel_photo',
        question: 'Take a now + history photo: line up the old Lake Merritt image with the shoreline. Use Full Story mode if you want your family in the memory.',
        photoSubject: 'Lake Merritt then-and-now public space comparison',
        timeTravelImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lake%20Merritt%2C%20Oakland%2C%20California-LCCN2008678131.jpg',
        timeTravelCaption: 'Historical reference: Lake Merritt, Oakland, California. Photochrom Print Collection, Library of Congress via Wikimedia Commons.',
        timeTravelOpacity: 0.46,
      },
      reveal: {
        funFact:
          'A then/now photo is a quiet question. The lake didn\'t change much; the city around it changed everything. The Panthers grew up here because Oakland had grown up around a broken promise — that public space and public care would be for everyone. Their answer was simple: if the city won\'t feed our kids, we will.',
      },
    },
    {
      id: 'lake-merritt-walk',
      order: 6,
      title: 'Imagine forward',
      lat: 37.8044,
      lon: -122.2595,
      address: '666 Bellevue Avenue, Oakland, CA 94610',
      clueText:
        'Find a bench. The Panthers ran more than 60 "survival programs" — free breakfast, free clinics, free shoes, a free ambulance, a free school, free legal aid, sickle cell testing, transport to visit jailed family. If you started a survival program for kids in YOUR city today, what would it be? Draw it.',
      parentHint:
        'Don\'t guide the answer. Whatever the kid draws — pet food, free haircuts, hot lunch, a phone-charging bench — is data about what they think is broken and how care could fix it.',
      prompt: {
        kind: 'drawing',
        question: 'Draw one survival program you would start for kids today.',
        drawingSubject: 'A kid-friendly community program idea inspired by the Panthers',
      },
      reveal: {
        funFact:
          'The Panthers ran more than 60 community programs by the mid-1970s. Not all of them worked. Many of them did. The lesson FamActify keeps coming back to: care is concrete. It looks like food at 7 AM, a doctor on the corner, a school that knows your name. Anyone can start one. Most cities are waiting for someone to.',
      },
    },
    {
      id: 'oakland-community-time-capsule',
      order: 7,
      title: 'Family community time capsule',
      lat: null,
      lon: null,
      clueText:
        'One last step. Find a quiet spot — the bench, a tree, the car ride home. Think of ONE person in your family or street who takes care of others in an ordinary, unfamous way. A grandparent who feeds neighbours. A coach who shows up early. A neighbour who watches everyone\'s mail. Type one sentence about them.',
      parentHint:
        'If a grandparent isn\'t with you, this is a perfect moment to call them right now. Ask: "Who in our family taught you what care looks like?" Their answer is the time capsule.',
      prompt: {
        kind: 'text',
        question: 'Write one sentence for the family time capsule: "In our family, care worth remembering is…"',
        correctAnswers: [],
      },
      reveal: {
        funFact:
          'The Panthers were teenagers when they started. Bobby Hutton was 16. Elaine Brown was 25 when she joined. The lesson they leave is not "everyone has to start a Party." It\'s simpler: care is the unit. Today you named one. The future will remember it because you did.',
      },
    },
  ],
};
