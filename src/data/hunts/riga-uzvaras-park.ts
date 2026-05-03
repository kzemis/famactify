import type { ScavengerHunt } from '@/types/hunt';

const UZVARAS_PARK = {
  lat: 56.9402,
  lon: 24.0857,
  address: 'Uzvaras parks, Pārdaugava, Rīga',
};

export const rigaUzvarasPark: ScavengerHunt = {
  id: 'riga-uzvaras-park',
  slug: 'riga-uzvaras-park',
  title: 'Uzvaras Park Active Clue Game',
  blurb: 'A flexible park hunt for the renewed Uzvaras Park landscape: water play, natural materials, movement, and calm observation.',
  coverEmoji: '🌳',
  hostName: 'FamActify Original',
  city: 'Rīga',
  countryCode: 'LV',
  primaryTheme: 'nature',
  ageMin: 4,
  ageMax: 12,
  durationMinutes: 55,
  difficulty: 'easy',
  estCostCents: 0,
  distanceMeters: 900,
  publishedAt: '2026-05-03',
  credits: 'Source facts: LiveRiga Uzvaras parks page; Riga City 2025 article about the renewed active/sports zone, water play equipment, natural materials, and 36+ ha total park area.',
  sponsors: [{ name: 'FamActify', url: 'https://famactify.com' }],
  stops: [
    {
      id: 'uzvaras-park-name',
      order: 0,
      title: 'Park Name Detective',
      ...UZVARAS_PARK,
      clueText: 'Start at a park sign, map, or safe path entrance. Find the park name before you begin exploring.',
      parentHint: 'LiveRiga describes Uzvaras parks as a broad, landscaped park in Pārdaugava.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which park are you exploring?',
        options: ['Uzvaras parks', 'Vērmanes dārzs', 'Arkādijas parks', 'Mežaparks'],
        correctAnswers: ['Uzvaras parks'],
      },
      reveal: {
        funFact: 'LiveRiga says Uzvaras parks is a spacious landscaped park in Pārdaugava and got its name in 1923.',
      },
    },
    {
      id: 'uzvaras-water-play',
      order: 1,
      title: 'Water Movement Lab',
      ...UZVARAS_PARK,
      clueText: 'Find the water play area or another place where water, sand, or movement is visible. Watch how something flows, rolls, spins, or changes direction.',
      parentHint: 'Riga City says the renewed park includes water equipment where children can experiment with water: pumping it, guiding flows, operating mills, and watching movement.',
      prompt: {
        kind: 'observation',
        question: 'Notice one thing that moves: water, wheels, sand, a ball, a scooter, or leaves.',
      },
      reveal: {
        funFact: 'Riga City describes special water play equipment that lets children pump water by hand, direct flows, operate mills, and observe water movement.',
      },
    },
    {
      id: 'uzvaras-natural-materials',
      order: 2,
      title: 'Natural Materials Hunt',
      ...UZVARAS_PARK,
      clueText: 'Find three natural textures in the park: wood, bark, stone, grass, sand, leaves, or soil.',
      parentHint: 'The Riga City article says play, sport, and rest elements were placed under existing trees and use natural materials.',
      prompt: {
        kind: 'text',
        question: 'Write one natural material you found.',
        correctAnswers: ['wood', 'bark', 'stone', 'grass', 'sand', 'leaf', 'leaves', 'soil', 'tree'],
      },
      reveal: {
        funFact: 'The renewed active zone was designed so play, sport, and rest elements fit into the landscape under existing trees.',
      },
    },
    {
      id: 'uzvaras-movement-choice',
      order: 3,
      title: 'Choose Your Movement',
      ...UZVARAS_PARK,
      clueText: 'Pick one safe movement: balance, climb, roll, run, stretch, scooter, cycle, or slow walk. Do it for 30 seconds.',
      parentHint: 'Keep it safe and age-appropriate. The prompt is intentionally flexible because park equipment and crowds vary.',
      prompt: {
        kind: 'observation',
        question: 'Do one safe movement challenge.',
      },
      reveal: {
        funFact: 'Riga City says the renewed park area was planned as a versatile environment for active recreation throughout the year.',
      },
    },
    {
      id: 'uzvaras-memory-photo',
      order: 4,
      title: 'Park Detail Memory',
      ...UZVARAS_PARK,
      clueText: 'Take one privacy-safe photo of a park detail: texture, sign, path curve, tree shadow, water shape, or play element — no faces.',
      parentHint: 'Good photos avoid people and focus on objects, textures, signs, or landscape.',
      prompt: {
        kind: 'photo',
        question: 'Take one privacy-safe photo of a park detail.',
        photoSubject: 'Uzvaras Park detail without faces',
      },
      reveal: {
        funFact: 'A good park hunt can be about noticing small design choices: where paths bend, how shade works, and what invites kids to move.',
      },
    },
  ],
};
