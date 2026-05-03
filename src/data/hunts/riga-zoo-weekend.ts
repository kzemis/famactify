import type { ScavengerHunt } from '@/types/hunt';

const RIGA_ZOO = {
  lat: 57.00664,
  lon: 24.15947,
  address: 'Rīgas Nacionālais zooloģiskais dārzs, Meža prospekts 1, Rīga, LV-1014',
};

export const rigaZooWeekend: ScavengerHunt = {
  id: 'riga-zoo-weekend',
  slug: 'riga-zoo-weekend',
  title: 'Riga Zoo Weekend Animal Detective',
  blurb: 'A flexible Riga Zoo scavenger game for noticing habitats, animal clues, and conservation stories without rushing from cage to cage.',
  coverEmoji: '🦒',
  hostName: 'FamActify Original',
  city: 'Rīga',
  countryCode: 'LV',
  primaryTheme: 'nature',
  ageMin: 4,
  ageMax: 14,
  durationMinutes: 75,
  difficulty: 'easy',
  estCostCents: 0,
  distanceMeters: 1000,
  publishedAt: '2026-05-03',
  credits: 'Source facts: Riga City page for Rīgas Nacionālais zooloģiskais dārzs, including address, Mežaparks location, 1912 history, nearly 400 species, and named zoo areas such as the Farmstead, Terrarium, Tropical House, Aquarium, Latvian reptile and amphibian hall, and Osteostāsti.',
  sponsors: [
    {
      name: 'FamActify',
      url: 'https://famactify.com',
    },
  ],
  stops: [
    {
      id: 'riga-zoo-gate',
      order: 0,
      title: 'Zoo Gate: Find Meža Prospekts 1',
      ...RIGA_ZOO,
      clueText: 'Start at the zoo entrance. Find the place name or address before you go animal-detective mode.',
      parentHint: 'The source-backed address is Meža prospekts 1, Rīga, LV-1014. Any entrance sign, ticket, or map can help.',
      prompt: {
        kind: 'multiple_choice',
        question: 'What is Riga Zoo’s address?',
        options: ['Meža prospekts 1', 'Brīvības bulvāris 1', 'Doma laukums 1', 'Rātslaukums 7'],
        correctAnswers: ['Meža prospekts 1'],
      },
      reveal: {
        funFact: 'Riga City lists Riga National Zoological Garden at Meža prospekts 1 in Rīga, in the heart of Mežaparks.',
      },
    },
    {
      id: 'riga-zoo-birthday',
      order: 1,
      title: 'Zoo Birthday Clue',
      ...RIGA_ZOO,
      clueText: 'Look for a map, sign, or information board that tells the story of the zoo. Your mission is to find how old this place is.',
      parentHint: 'If there is no history sign nearby, read this one aloud: Riga Zoo has been in Mežaparks since 1912.',
      prompt: {
        kind: 'multiple_choice',
        question: 'According to Riga City, since what year has Riga Zoo been in Mežaparks?',
        options: ['1912', '1935', '1991', '2021'],
        correctAnswers: ['1912'],
      },
      reveal: {
        funFact: 'Riga City says Riga National Zoological Garden has been in the heart of Mežaparks since 1912.',
      },
    },
    {
      id: 'riga-zoo-many-species',
      order: 2,
      title: 'Nearly 400 Species Challenge',
      ...RIGA_ZOO,
      clueText: 'Walk slowly and choose three different animals you notice. They can be big, tiny, furry, scaly, swimming, resting, or hiding.',
      parentHint: 'This is an observation stop. The source says the zoo invites visitors to discover nearly 400 different animal species, but kids only need to notice three.',
      prompt: {
        kind: 'observation',
        question: 'Notice three different animal species or animal homes.',
      },
      reveal: {
        funFact: 'Riga City says Riga Zoo is home to nearly 400 different animal species.',
      },
    },
    {
      id: 'riga-zoo-indoor-homes',
      order: 3,
      title: 'Indoor Homes Detective',
      ...RIGA_ZOO,
      clueText: 'Find one indoor animal home: Farmstead, Terrarium, Tropical House, Aquarium, or another indoor exhibit. What changes inside compared with outside?',
      parentHint: 'The Riga City source names several indoor areas: Farmstead, Terrarium, Tropical House, Aquarium, and the Latvian reptile and amphibian hall.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which of these is named by Riga City as a Riga Zoo area?',
        options: ['Tropical House', 'Moon Rocket Room', 'Dinosaur Airport', 'Chocolate Castle'],
        correctAnswers: ['Tropical House'],
      },
      reveal: {
        funFact: 'Riga City says visitors can look into indoor animal homes including the Farmstead, Terrarium, Tropical House, and Aquarium.',
      },
    },
    {
      id: 'riga-zoo-animal-movement',
      order: 4,
      title: 'Animal Movement Minute',
      ...RIGA_ZOO,
      clueText: 'Pick one animal you can watch respectfully for one quiet minute. How does it move: crawl, swim, jump, climb, fly, waddle, or rest?',
      parentHint: 'Let the child choose any visible animal. If animals are resting or hidden, resting also counts as behaviour.',
      prompt: {
        kind: 'text',
        question: 'Write one movement word you noticed.',
        correctAnswers: ['crawl', 'swim', 'jump', 'climb', 'fly', 'waddle', 'walk', 'run', 'rest', 'sleep', 'hide', 'eat'],
      },
      reveal: {
        funFact: 'A zoo visit is not only about seeing animals up close. Careful watching helps kids notice habitats, behaviour, and how different animals use their bodies.',
      },
    },
    {
      id: 'riga-zoo-osteostasti',
      order: 5,
      title: 'Osteostāsti: Bone Story',
      ...RIGA_ZOO,
      clueText: 'If your route passes the Hippo House / Osteostāsti exhibit, look for the “bone story.” If not, answer from the clue.',
      parentHint: 'The Riga City source says the Osteostāsti exhibition in the Hippo House displays the skull and tusks of the famous elephant Radža.',
      prompt: {
        kind: 'multiple_choice',
        question: 'Which famous animal is connected with the Osteostāsti skull and tusks story?',
        options: ['Elephant Radža', 'Tiger Toms', 'Seal Krista', 'Rabbit Rūdis'],
        correctAnswers: ['Elephant Radža'],
      },
      reveal: {
        funFact: 'Riga City says the Hippo House exhibition “Osteostāsti” displays the skull and tusks of the famous elephant Radža.',
      },
    },
    {
      id: 'riga-zoo-kind-photo',
      order: 6,
      title: 'Kind Zoo Memory',
      ...RIGA_ZOO,
      clueText: 'Before you leave, take one privacy-safe photo of a sign, map, habitat detail, animal statue, leaf, footprint shape, or texture — no faces.',
      parentHint: 'Good subjects: a map corner, habitat sign, animal silhouette, feather/leaf texture, or public sign. Avoid photographing strangers or children.',
      prompt: {
        kind: 'photo',
        question: 'Take one privacy-safe photo of a zoo detail that helps you remember the visit.',
        photoSubject: 'Zoo detail, sign, habitat, texture, or map without faces',
      },
      reveal: {
        funFact: 'The best zoo memories are often small details: a sound, a pattern, a footprint shape, a sign, or a careful question asked at the right moment.',
      },
    },
  ],
};
