import type { ScavengerHunt } from '@/types/hunt';

// CG-02-LITE — Lake Merritt Lakeshore evening city game.
// Light companion to CG-02 (Black Panther) — same city, lighter mood, shorter walk.
// CityGame question: "What makes a place feel like community?"
// Three dimensions (encoded as code comments — no schema change yet):
//   Dim 1 — Old civic beauty             (steps 1, 2)
//   Dim 2 — Shared space, every day       (steps 3, 4)
//   Dim 3 — Nature is community too       (steps 5, 6)

export const oaklandLakeMerrittLakeshore: ScavengerHunt = {
  id: 'oakland-lake-merritt-lakeshore',
  slug: 'oakland-lake-merritt-lakeshore-evening',
  title: 'Lake Merritt Lakeshore Evening City Game',
  blurb:
    'A short Oakland evening walk around Lake Merritt: old civic beauty, shared public space, birds, boats, and one question — what makes a place feel like community?',
  coverEmoji: '🌅',
  hostName: 'FamActify Original',
  city: 'Oakland',
  countryCode: 'US',
  primaryTheme: 'community',
  ageMin: 6,
  ageMax: 14,
  durationMinutes: 45,
  difficulty: 'easy',
  estCostCents: 0,
  distanceMeters: 1900,
  publishedAt: '2026-05-08',
  credits:
    'Companion to the Oakland Black Panther Community Power City Game. Same lake, lighter pace — designed as a relaxed family evening walk in the Brockton CityGames spirit: notice ordinary public life.',
  sourceLinks: [
    'https://lakemerrittinstitute.org/about-lake-merritt/',
    'https://www.lakemerritt.org/',
    'https://clevelandcascade.org/wp/history-2/origins/',
    'https://localwiki.org/oakland/Oakland_Pergola_and_Colonnade',
    'https://www.oaklandca.gov/Community/Parks-Facilities/Recreation-Centers/Lake-Merritt-Sailboat-House',
    'https://www.oaklandca.gov/files/assets/city/v/1/transportation/documents/projects/lakeside-green-streets-restoration-project/lakemerrittmasterplan.pdf',
    'https://commons.wikimedia.org/wiki/File:Lake_Merritt,_Oakland,_California-LCCN2008678131.jpg',
  ],
  generationNotes:
    'CityGame v1 polish (2026-05-10): copy tightened to be kid-actionable rather than guide-book-like; reveals lead with the concrete year/name (1870 refuge, 1923 Cascade designer Howard Gilkey, 1913 Pergola & Colonnade); parentHints now contain literal sentences to say aloud. Light hunt — keep it 45 min, no time capsule (the Black Panther CityGame is the deep version of this lake).',
  stops: [
    // ── Dimension 1 — Old civic beauty ──────────────────────────────────
    {
      id: 'lake-merritt-time-travel-opener',
      order: 0,
      title: 'Then / now: what is a postcard worth of city?',
      lat: 37.8106,
      lon: -122.2529,
      address: 'Lakeshore Avenue near El Embarcadero, Oakland, CA',
      clueText:
        'Start with the memory-maker. Hold up an old Lake Merritt postcard image against today\'s water. What stayed? What\'s gone? Who shows up in the old picture, and who\'s walking past you now?',
      parentHint:
        'Try asking: "When a city made a postcard back then, what did they want strangers to see? What would today\'s postcard look like — and who would be in it?"',
      prompt: {
        kind: 'time_travel_photo',
        question: 'Take a now + history photo: line up the old Lake Merritt image with today\'s lake edge. Use Full Story mode for a family selfie.',
        photoSubject: 'Lake Merritt then-and-now comparison',
        timeTravelImageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Lake%20Merritt%2C%20Oakland%2C%20California-LCCN2008678131.jpg',
        timeTravelCaption: 'Historical reference: Lake Merritt, Oakland, California. Photochrom Print Collection, Library of Congress via Wikimedia Commons.',
        timeTravelOpacity: 0.46,
      },
      reveal: {
        funFact:
          'Old civic postcards are sneaky little time machines. They show what a city wanted to be proud of, on purpose. The lake itself barely changed in 100 years. The people walking around it did — and that\'s how you can tell whose city it really was, and whose city it is now.',
      },
    },
    {
      id: 'cleveland-cascade',
      order: 1,
      title: 'Cleveland Cascade — water as decoration',
      lat: 37.81,
      lon: -122.2479,
      address: 'Cleveland Cascade, Lakeshore Avenue & Cleveland Street, Oakland, CA',
      clueText:
        'Find the old stone stairs above Lakeshore. Walk only as far up as feels safe, then turn around and look back at the lake. This isn\'t just exercise. A landscape architect designed all of this — terraces, bowls, lights — to make a city walk into a small civic gift.',
      parentHint:
        'Try asking: "Why would a city build a beautiful stairway here instead of just a plain sidewalk? Who is something this pretty FOR?"',
      prompt: {
        kind: 'photo',
        question: 'Take a photo of the stairs, a detail, or the lake view that feels like "old Oakland civic pride."',
        photoSubject: 'Cleveland Cascade stairs, detail, or Lake Merritt view',
      },
      reveal: {
        funFact:
          'The Cleveland Cascade was designed in 1923 by Howard Gilkey — an Italian-Renaissance-inspired waterfall with twenty illuminated tiers running down to the lake. It fell apart for decades. Then in 2004 neighbours organised, raised money, and brought it back. That\'s civic care, two generations apart.',
      },
    },

    // ── Dimension 2 — Shared space, every day ───────────────────────────
    {
      id: 'lakeshore-el-embarcadero-edge',
      order: 2,
      title: 'Walk the edge — who else is here?',
      lat: 37.8106,
      lon: -122.2529,
      address: 'Lakeshore Avenue near El Embarcadero, Oakland, CA',
      clueText:
        'Walk along the lake edge for a minute. Now stop. Look for three signs that this is shared space: someone running, someone resting on a bench, a stroller, a dog, music in the air, a fishing pole, a couple kissing, a kid drawing.',
      parentHint:
        'Try asking: "What makes a place feel like it belongs to everybody?" Listen first — the answer is usually a quieter version of "people are different and nobody\'s being chased away."',
      prompt: {
        kind: 'audio',
        question: 'Record 6 seconds of Lake Merritt evening sound — water, birds, footsteps, voices in the distance, or wind.',
        audioSubject: 'Lake Merritt evening ambience: water, birds, footsteps, voices, wind',
        audioMaxSeconds: 6,
      },
      reveal: {
        funFact:
          'Lake Merritt is technically a tidal lagoon — saltwater from the Bay, breathing in and out twice a day. That\'s why you might hear gulls instead of just ducks, and why the water has a faint sea smell. It\'s the Pacific Ocean, taking a walk into downtown Oakland.',
      },
    },
    {
      id: 'lake-merritt-pergola-colonnade',
      order: 3,
      title: 'Pergola — when columns frame a lake',
      lat: 37.811,
      lon: -122.2554,
      address: '599 El Embarcadero, Oakland, CA',
      clueText:
        'Find the columns by the lake. Stand where the white columns frame the water like a giant picture frame. This was built when the city wanted to turn an ordinary lake view into something you stop and look at.',
      parentHint:
        'Try asking: "How does the same lake feel different when you look at it through these columns? What changes when architecture says \'look here\'?"',
      prompt: {
        kind: 'drawing',
        question: 'Draw the simplest shape you see — a column, arch, shadow, the lake line, or the frame around the view.',
        drawingSubject: 'Column, arch, shadow, lake line, or framed lake view',
      },
      reveal: {
        funFact:
          'The Lake Merritt Pergola and Colonnade was built in 1913 as part of Oakland\'s "City Beautiful" push — a national movement that said even an ordinary lake deserves columns, gardens, and a frame. It\'s been a wedding-photo backdrop for a hundred years.',
      },
    },

    // ── Dimension 3 — Nature is community too ───────────────────────────
    {
      id: 'rotary-nature-center-bird-refuge',
      order: 4,
      title: 'Refuge — care that has feathers',
      lat: 37.8078,
      lon: -122.2592,
      address: '600 Bellevue Avenue, Oakland, CA',
      clueText:
        'Slow down near the bird-refuge area. Look for two refuge clues: a bird on the water, an island, a sign about wildlife, a feather, water moving the wrong way, or someone watching very quietly.',
      parentHint:
        'Try asking: "If a city decides this water is FOR the birds, what is the city saying about what counts as community?"',
      prompt: {
        kind: 'observation',
        question: 'Notice two refuge clues: a bird, sign, island, water movement, feather, nest area, or person watching quietly.',
      },
      reveal: {
        funFact:
          'In 1870, California declared Lake Merritt a wildlife refuge — the first official wildlife refuge in the United States. That decision is now 156 years old. Every duck and pelican you see is still being protected by a law older than your great-great-grandparents.',
      },
    },
    {
      id: 'lake-merritt-boating-center',
      order: 5,
      title: 'Boats — a lake you can DO',
      lat: 37.8064,
      lon: -122.2586,
      address: '568 Bellevue Avenue, Oakland, CA',
      clueText:
        'End near the boating center. Look at the boats, ropes, docks, ripples, the way the water moves. The lake isn\'t only something to look at — it\'s something people DO. Last question.',
      parentHint:
        'Try asking: "What would make you want to come back here? Boats, birds, a drawing book, a picnic, a friend?" The answer is the seed of a family tradition.',
      prompt: {
        kind: 'multiple_choice',
        question: 'What kind of water is Lake Merritt?',
        options: ['A tidal lagoon connected to the Bay', 'A mountain lake', 'A swimming pool', 'A river waterfall'],
        correctAnswers: ['A tidal lagoon connected to the Bay'],
      },
      reveal: {
        funFact:
          'Lake Merritt is many places at once: tidal lagoon, wildlife refuge, walking loop, boating place, sunset view, wedding backdrop, breakfast spot for thousands of birds, and Oakland\'s public living room. The trick of a good city is having one place that\'s allowed to be all of those things at once.',
      },
    },
  ],
};
