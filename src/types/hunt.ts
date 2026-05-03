// SCV-01 — Scavenger Hunt feature types
// See: ~/knowledge/famactify/docs/code/features/SCV-01-scavenger-hunt.md

export type HuntDifficulty = 'easy' | 'medium' | 'hard';

export type HuntPromptKind =
  | 'text'             // typed answer, case-insensitive contains-match
  | 'multiple_choice'  // pick one
  | 'photo'            // submit a photo of the subject
  | 'observation';     // no answer required, just acknowledge

export interface HuntPrompt {
  kind: HuntPromptKind;
  question: string;
  /** for multiple_choice */
  options?: string[];
  /** for text — list of acceptable answers (lowercased contains-match) */
  correctAnswers?: string[];
  /** for photo — what should the photo contain */
  photoSubject?: string;
}

export interface HuntStop {
  id: string;
  order: number;
  title: string;
  /** Lat/lon for "I'm here" geofence + map pin */
  lat: number;
  lon: number;
  address?: string;
  /** Clue copy shown to player BEFORE they arrive */
  clueText: string;
  clueImage?: string;
  /** Optional voice-over URL (Phase 3) */
  clueAudio?: string;
  prompt: HuntPrompt;
  /** Shown AFTER answering — fun fact / reveal */
  reveal: {
    funFact: string;
    image?: string;
  };
}

export interface HuntSponsor {
  name: string;
  logo?: string;
  url?: string;
}

export interface ScavengerHunt {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  /** Cover illustration URL or emoji-fallback */
  coverEmoji: string;
  coverImage?: string;
  /** Host org / city / venue name */
  hostName: string;
  hostLogo?: string;
  /** Region / city for filtering */
  city: string;
  countryCode: 'US' | 'LV' | string;
  primaryTheme: 'history' | 'music' | 'nature' | 'art' | 'food' | 'science' | 'community';
  ageMin: number;
  ageMax: number;
  durationMinutes: number;
  difficulty: HuntDifficulty;
  /** 0 = free; otherwise est. cost in cents (for filter) */
  estCostCents: number;
  /** Total walking/driving distance in meters (rough) */
  distanceMeters: number;
  stops: HuntStop[];
  sponsors?: HuntSponsor[];
  /** Optional credits / "designed by" line shown on detail page */
  credits?: string;
  publishedAt: string; // ISO date
}

// ── Attempt tracking (persisted in localStorage for Phase 1) ─────────────────

export interface HuntStopResult {
  stopId: string;
  answeredAt: string; // ISO date
  answer: string;
  photoDataUrl?: string;
  isCorrect?: boolean;
  skipped?: boolean;
}

export interface HuntAttempt {
  id: string;
  huntId: string;
  /** Family profile id (from FamilyModeContext) */
  profileId: string;
  startedAt: string;
  completedAt?: string;
  currentStopOrder: number; // 0..stops.length
  results: HuntStopResult[];
  /** When saved as a Trip in /trips */
  tripId?: string;
}
