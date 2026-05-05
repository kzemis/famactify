// SCV-01 — Explorer progression tiers
// Derives cumulative tier from total completed hunts. No DB needed.

import type { ExplorerTier, ExplorerProgression } from '@/types/hunt';
import { huntsService } from './huntsService';

export const TIER_THRESHOLDS: { tier: ExplorerTier; label: string; emoji: string; minHunts: number }[] = [
  { tier: 'beginner_explorer', label: 'Beginner Explorer', emoji: '🧭', minHunts: 1 },
  { tier: 'city_explorer', label: 'City Explorer', emoji: '🏙️', minHunts: 3 },
  { tier: 'trail_blazer', label: 'Trail Blazer', emoji: '🔥', minHunts: 5 },
  { tier: 'world_adventurer', label: 'World Adventurer', emoji: '🌍', minHunts: 10 },
];

export function computeProgression(totalCompleted: number): ExplorerProgression {
  let currentIdx = -1;
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalCompleted >= TIER_THRESHOLDS[i].minHunts) {
      currentIdx = i;
      break;
    }
  }

  const current = currentIdx >= 0 ? TIER_THRESHOLDS[currentIdx] : null;
  const next = currentIdx < TIER_THRESHOLDS.length - 1 ? TIER_THRESHOLDS[currentIdx + 1] : null;

  const prevMin = current?.minHunts ?? 0;
  const nextMin = next?.minHunts ?? prevMin;
  const range = nextMin - prevMin;
  const progressPct = range > 0 ? Math.min(1, (totalCompleted - prevMin) / range) : 1;

  return {
    totalCompleted,
    currentTier: current?.tier ?? null,
    currentTierLabel: current?.label ?? 'New Explorer',
    nextTier: next?.tier ?? null,
    nextTierLabel: next?.label ?? null,
    huntsToNextTier: next ? Math.max(0, next.minHunts - totalCompleted) : 0,
    progressPct: next ? progressPct : 1,
  };
}

export const progressionService = {
  async getProgression(profileId: string): Promise<ExplorerProgression> {
    const attempts = await huntsService.listAttemptsForProfile(profileId);
    const completed = attempts.filter(a => !!a.completedAt);
    // Count unique hunts (not repeat completions)
    const uniqueHunts = new Set(completed.map(a => a.huntId));
    return computeProgression(uniqueHunts.size);
  },
};
