// SCV-01 — Scavenger Hunt feature types
// See: ~/knowledge/famactify/docs/code/features/SCV-01-scavenger-hunt.md

export type HuntDifficulty = 'easy' | 'medium' | 'hard';

export type HuntPromptKind =
  | 'text'             // typed answer, case-insensitive contains-match
  | 'multiple_choice'  // pick one
  | 'photo'            // submit a photo of the subject
  | 'observation'      // no answer required, just acknowledge
  | 'audio'            // record a short sound clip (default 5s)
  | 'drawing'          // draw on an in-app canvas
  | 'time_travel_photo'; // line up a historical/source image over live camera

export interface HuntPrompt {
  kind: HuntPromptKind;
  question: string;
  /** for multiple_choice */
  options?: string[];
  /** for text — list of acceptable answers (lowercased contains-match) */
  correctAnswers?: string[];
  /** for photo — what should the photo contain */
  photoSubject?: string;
  /** for audio — what to listen for; informative only */
  audioSubject?: string;
  /** for audio — max recording length in seconds (default 5; clamped 2..15) */
  audioMaxSeconds?: number;
  /** for drawing — what to draw; informative only */
  drawingSubject?: string;
  /** for time_travel_photo — source-backed historical/archival image URL */
  timeTravelImageUrl?: string;
  /** for time_travel_photo — source/caption copy shown under the overlay */
  timeTravelCaption?: string;
  /** for time_travel_photo — overlay opacity, default 0.5 */
  timeTravelOpacity?: number;
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
  /** Optional voice-over URL (Phase 3) — when present, plays an audio file; otherwise falls back to TTS */
  clueAudio?: string;
  /** Optional parent-only hint shown when kid taps "Ask a grown-up" (co-pilot mode) */
  parentHint?: string;
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
  artifactKind?: 'scavenger_hunt';
  artifactVersion?: number;
  createdVia?: 'human' | 'ai_assisted' | 'ai_generated';
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
  /** Source/provenance URLs that support the hunt facts */
  sourceLinks?: string[];
  /** Prompt or brief used when an AI/agent creates or drafts the artifact */
  aiPrompt?: string;
  /** Notes about generation, fact-checking, or human review */
  generationNotes?: string;
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
  /** Photo verification (ML or manual). undefined = not photo / not verified yet */
  photoVerified?: boolean;
  photoVerifyConfidence?: number; // 0..1
  photoNeedsReview?: boolean;
  photoReviewStatus?: 'pending' | 'approved' | 'rejected';
  photoReviewNotes?: string;
  photoReviewedAt?: string;
  photoReviewedBy?: string;
  /** Audio recording from the `audio` prompt — base64 data URL (e.g. audio/webm) */
  audioDataUrl?: string;
  audioDurationMs?: number;
  /** Drawing from the `drawing` prompt — PNG data URL exported from canvas */
  drawingDataUrl?: string;
}

// ── Badges ────────────────────────────────────────────────────────────────────

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface EarnedBadge {
  huntId: string;
  huntSlug: string;
  huntTitle: string;
  coverEmoji: string;
  city: string;
  tier: BadgeTier;
  /** % stops solved correctly (excluding skips) */
  scorePct: number;
  /** Total stops solved (regardless of correctness) */
  stopsCompleted: number;
  totalStops: number;
  earnedAt: string; // ISO date
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
