import type { ScavengerHunt } from '@/types/hunt';

const BARONA_PLAYGROUND = {
  lat: 56.9589,
  lon: 24.1474,
  address: 'Centra sporta kvartāla bērnu rotaļu laukums, Krišjāņa Barona iela 116A, Rīga',
};

export const rigaBaronaPlayground: ScavengerHunt = {
  id: 'riga-barona-playground',
  slug: 'riga-barona-playground',
  title: 'Barona Playground Mini Quest',
  blurb: 'A short movement-and-noticing game for the children’s playground by Krišjāņa Barona iela 116A.',
  coverEmoji: '🛝',
  hostName: 'FamActify Original',
  city: 'Rīga',
  countryCode: 'LV',
  primaryTheme: 'community',
  ageMin: 3,
  ageMax: 10,
  durationMinutes: 30,
  difficulty: 'easy',
  estCostCents: 0,
  distanceMeters: 250,
  publishedAt: '2026-05-03',
  credits: 'Source facts: Mapeirons and map listings identify Centra sporta kvartāla bērnu rotaļu laukums at Krišjāņa Barona iela 116/116A, Rīga.',
  sponsors: [{ name: 'FamActify', url: 'https://famactify.com' }],
  stops: [
    {
      id: 'barona-find-place',
      order: 0,
      title: 'Find the Playground',
      ...BARONA_PLAYGROUND,
      clueText: 'Start at the children’s playground in Centra sporta kvartāls near Krišjāņa Barona iela 116A.',
      parentHint: 'Use the address/source anchor: Krišjāņa Barona iela 116A, Rīga.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which street is this playground connected with?',
        options: ['Krišjāņa Barona iela', 'Doma laukums', 'Meža prospekts', 'Rātslaukums'],
        correctAnswers: ['Krišjāņa Barona iela'],
      },
      reveal: {
        funFact: 'This mini quest is intentionally short: playground hunts work best when the game supports free play instead of replacing it.',
      },
    },
    {
      id: 'barona-colour-shapes',
      order: 1,
      title: 'Colour + Shape Spy',
      ...BARONA_PLAYGROUND,
      clueText: 'Find three colours and two shapes around the playground. They can be on equipment, signs, ground markings, clothes, or shadows.',
      parentHint: 'For toddlers, point and name colours together. For older kids, ask them to find unusual shapes.',
      prompt: {
        kind: 'observation',
        question: 'Find three colours and two shapes.',
      },
      reveal: {
        funFact: 'Colour and shape hunting turns a familiar playground into a tiny observation lab.',
      },
    },
    {
      id: 'barona-kind-movement',
      order: 2,
      title: 'Kind Movement Challenge',
      ...BARONA_PLAYGROUND,
      clueText: 'Choose one safe movement: balance, climb, slide, hop, stretch, or slow-walk. Then let someone else have a turn.',
      parentHint: 'The “kind” part matters: kids complete the stop by noticing sharing and turns.',
      prompt: {
        kind: 'observation',
        question: 'Do one safe movement and one kind turn-taking moment.',
      },
      reveal: {
        funFact: 'Playgrounds teach more than movement: waiting, watching, courage, and turn-taking are all part of the game.',
      },
    },
    {
      id: 'barona-texture-photo',
      order: 3,
      title: 'Texture Photo',
      ...BARONA_PLAYGROUND,
      clueText: 'Take a privacy-safe close-up photo of one texture: rubber ground, metal, wood, rope, sand, leaf, or shadow — no faces.',
      parentHint: 'Close-up textures make good memory photos and avoid photographing strangers.',
      prompt: {
        kind: 'photo',
        question: 'Take one privacy-safe playground texture photo.',
        photoSubject: 'Playground texture without faces',
      },
      reveal: {
        funFact: 'A small texture photo can become a memory trigger: “that was the day we found the bumpy blue ground.”',
      },
    },
  ],
};
