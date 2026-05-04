import type { ScavengerHunt } from '@/types/hunt';

const ALBERT_STREET_WIKI = 'https://en.wikipedia.org/wiki/Albert_Street,_Riga';
const ALBERT_STREET_LATVIANS = 'https://www.latvians.com/index.php?en%2FTrips%2FFeatures-AlbertaIela%2FNo-00-Alberta%2Findex.ssi=';
const ALBERT_STREET_OLD_IMAGE = 'https://latvians.com/en/Trips/Features-AlbertaIela/No-00-Alberta/figures/24-Albert-strasse-grayscale.jpg';

export const rigaAlbertStreetTimeTravel: ScavengerHunt = {
  id: 'riga-albert-street-time-travel',
  slug: 'riga-albert-street-time-travel',
  title: 'Albert Street Time-Travel Art Nouveau Hunt',
  blurb: 'A short Riga Art Nouveau walk where kids line up an old Albertstraße photo with today’s Alberta iela and hunt for architects, faces, towers, and museum clues.',
  coverEmoji: '🕰️',
  hostName: 'FamActify Original',
  city: 'Rīga',
  countryCode: 'LV',
  primaryTheme: 'art',
  ageMin: 7,
  ageMax: 14,
  durationMinutes: 45,
  difficulty: 'easy',
  estCostCents: 0,
  distanceMeters: 255,
  publishedAt: '2026-05-03',
  credits: 'Source facts: Wikipedia page “Albert Street, Riga”; Latvians.com “Alberta iela, Albert Street” feature and historical Albertstraße image; coordinates checked with OpenStreetMap/Nominatim for Alberta iela addresses.',
  sourceLinks: [
    ALBERT_STREET_WIKI,
    ALBERT_STREET_LATVIANS,
    ALBERT_STREET_OLD_IMAGE,
    'https://www.openstreetmap.org/search?query=Alberta%20iela%2C%20Riga',
  ],
  sponsors: [
    {
      name: 'FamActify',
      url: 'https://famactify.com',
    },
  ],
  stops: [
    {
      id: 'albert-street-time-travel-view',
      order: 0,
      title: 'Time-Travel View: Albertstraße → Alberta iela',
      lat: 56.95904,
      lon: 24.109712,
      address: 'Alberta iela, Centrs, Rīga',
      clueText: 'Start on Alberta iela where you can safely see the street façades in a row. Hold the phone up and try to line the old Albertstraße image with today’s buildings.',
      parentHint: 'Use building edges, balconies, roofline shapes, and the curve of the street to help line up the historical image. Stay on the sidewalk.',
      prompt: {
        kind: 'time_travel_photo',
        question: 'Line up the historical Albertstraße view with today’s Alberta iela and capture your best match.',
        timeTravelImageUrl: ALBERT_STREET_OLD_IMAGE,
        timeTravelCaption: 'Historical grayscale Albertstraße view from Latvians.com “Alberta iela, Albert Street” feature. Use only as a visual alignment overlay; stay safely on the sidewalk.',
        timeTravelOpacity: 0.5,
      },
      reveal: {
        funFact: 'Wikipedia says Albert Street was built in 1901 and named after Bishop Albert, the founder of Riga in 1201. Latvians.com presents the street as one of Riga’s great Jugendstil / Art Nouveau treasures.',
      },
    },
    {
      id: 'albert-street-bishop-albert-clue',
      order: 1,
      title: 'Name Detective: Who Was Albert?',
      lat: 56.9589533,
      lon: 24.1110224,
      address: 'Alberta iela 2A, Rīga, LV-1010',
      clueText: 'Look for the street name “Alberta iela.” The street name itself is your clue: who is Albert?',
      parentHint: 'The source-backed answer is Bishop Albert. Wikipedia says he founded Riga in 1201.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Albert Street is named after which historical figure?',
        options: ['Bishop Albert', 'Albert Einstein', 'Queen Alberta', 'A ship called Albert'],
        correctAnswers: ['Bishop Albert'],
      },
      reveal: {
        funFact: 'Wikipedia identifies the street’s namesake as Bishop Albert, connected with Riga’s founding in 1201.',
      },
    },
    {
      id: 'albert-street-eisenstein-facades',
      order: 2,
      title: 'Eisenstein Façade Hunt',
      lat: 56.9593002,
      lon: 24.109658,
      address: 'Alberta iela 8, Rīga, LV-1010',
      clueText: 'Find one of the most dramatic façades on the street. Look up for faces, masks, balconies, curves, and sculptural details.',
      parentHint: 'Wikipedia lists several Alberta iela buildings by Mikhail Eisenstein, including numbers 2a, 4, 6, 8, and 13.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which architect designed many of the apartment buildings on Alberta iela?',
        options: ['Mikhail Eisenstein', 'Eižens Laube only', 'Antoni Gaudí', 'Frank Lloyd Wright'],
        correctAnswers: ['Mikhail Eisenstein'],
      },
      reveal: {
        funFact: 'Wikipedia says many apartment buildings along Albert Street were designed by Mikhail Eisenstein, whose decorative creativity is reflected in the street’s Art Nouveau façades.',
      },
    },
    {
      id: 'albert-street-no9-peksens',
      order: 3,
      title: 'No. 9: Pēkšēns Pattern Spotter',
      lat: 56.9590141,
      lon: 24.109163,
      address: 'Alberta iela 9, Rīga, LV-1010',
      clueText: 'Stand safely near No. 9 and choose one decorative detail: a line, curve, plant shape, face, window, or balcony edge.',
      parentHint: 'Wikipedia lists Alberta iela 9 as a residential building by Konstantīns Pēkšēns, built in 1901.',
      prompt: {
        kind: 'drawing',
        question: 'Draw one small pattern or shape you notice on the façade.',
        drawingSubject: 'One façade detail from Alberta iela 9: curve, window, plant shape, face, or balcony edge',
      },
      reveal: {
        funFact: 'Wikipedia lists Alberta iela 9 as a residential building by Konstantīns Pēkšēns, built in 1901 — the same year Wikipedia gives for the street’s construction start.',
      },
    },
    {
      id: 'albert-street-no12-museum',
      order: 4,
      title: 'No. 12: Museum House',
      lat: 56.9596096,
      lon: 24.1085166,
      address: 'Alberta iela 12, Rīga, LV-1010',
      clueText: 'Walk to No. 12. Find the museum connection and notice how the entrance, tower, or windows feel different from a plain apartment block.',
      parentHint: 'Wikipedia says Pēkšēns’ former residence at No. 12 has housed the Riga Art Nouveau Museum since April 2009.',
      prompt: {
        kind: 'multiple_choice',
        question: 'What museum is located at Alberta iela 12?',
        options: ['Riga Art Nouveau Museum', 'Riga Zoo', 'Latvian War Museum', 'House of the Blackheads Museum'],
        correctAnswers: ['Riga Art Nouveau Museum'],
      },
      reveal: {
        funFact: 'Wikipedia says No. 12 was designed by Konstantīns Pēkšēns and Eižens Laube, and that Pēkšēns’ former residence there has housed the Riga Art Nouveau Museum since April 2009.',
      },
    },
    {
      id: 'albert-street-no13-memory-photo',
      order: 5,
      title: 'No. 13: Final Detail Memory',
      lat: 56.9592118,
      lon: 24.1078606,
      address: 'Alberta iela 13, Rīga, LV-1010',
      clueText: 'Finish near No. 13. Look up one last time and take a privacy-safe close-up of a public building detail — no faces, no private windows.',
      parentHint: 'Wikipedia lists Alberta iela 13 as a residential building by Mikhail Eisenstein, built in 1904, and says it is now owned by Riga Graduate School of Law.',
      prompt: {
        kind: 'photo',
        question: 'Take one privacy-safe photo of an Art Nouveau detail you want to remember.',
        photoSubject: 'Alberta iela public façade detail without people’s faces',
      },
      reveal: {
        funFact: 'Wikipedia lists Alberta iela 13 as another Mikhail Eisenstein building from 1904, and notes that it is now owned by Riga Graduate School of Law.',
      },
    },
  ],
};
