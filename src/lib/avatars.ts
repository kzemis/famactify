// Curated avatar emoji presets for participant identity.
// Used in PlayerIdentityCard, RaceLobby, DuoLobby, and leaderboard renders.

/** 16 kid-friendly animal emojis — default picker for solo/duo identity */
export const ANIMAL_AVATARS = [
  '🦊', '🐯', '🦁', '🐼', '🐨', '🐸',
  '🦄', '🐶', '🐱', '🐰', '🐻', '🐧',
  '🦉', '🐢', '🦒', '🐙',
] as const;

/** Family-team presets — used in race mode for a "team" feel */
export const FAMILY_AVATARS = [
  '👨‍👩‍👧', '👨‍👩‍👦', '👩‍👧‍👦', '👨‍👧',
  '👩‍👦', '👨‍👩‍👧‍👦', '🦸‍♂️', '🦸‍♀️',
] as const;

/** Full grid: animals first, then family presets */
export const ALL_AVATAR_EMOJIS: string[] = [...ANIMAL_AVATARS, ...FAMILY_AVATARS];

/** Pick a random animal avatar as a default */
export function pickRandomAvatar(): string {
  return ANIMAL_AVATARS[Math.floor(Math.random() * ANIMAL_AVATARS.length)];
}
