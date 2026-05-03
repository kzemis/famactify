import type { EarnedBadge, BadgeTier } from '@/types/hunt';
import { huntsService } from './huntsService';

function tierForScore(scorePct: number): BadgeTier {
  if (scorePct >= 1.0) return 'gold';
  if (scorePct >= 0.75) return 'silver';
  return 'bronze';
}

export const badgesService = {
  /**
   * Compute earned badges for a profile.
   * One badge per completed hunt; tier reflects accuracy (% correct, ignoring skips).
   */
  async listEarned(profileId: string): Promise<EarnedBadge[]> {
    const attempts = await huntsService.listAttemptsForProfile(profileId);
    const completed = attempts.filter(a => !!a.completedAt);
    if (completed.length === 0) return [];

    // Resolve hunt metadata for each unique huntId
    const huntIds = Array.from(new Set(completed.map(a => a.huntId)));
    const huntMeta = new Map<string, { slug: string; title: string; coverEmoji: string; city: string; totalStops: number }>();
    for (const id of huntIds) {
      // Try DB-id-keyed first, fall back to slug match (seed hunts use slug as id)
      const byId = await huntsService.getHuntById(id).catch(() => null);
      if (byId) {
        huntMeta.set(id, { slug: byId.slug, title: byId.title, coverEmoji: byId.coverEmoji, city: byId.city, totalStops: byId.stops.length });
        continue;
      }
      const bySlug = await huntsService.getHunt(id);
      if (bySlug) {
        huntMeta.set(id, { slug: bySlug.slug, title: bySlug.title, coverEmoji: bySlug.coverEmoji, city: bySlug.city, totalStops: bySlug.stops.length });
      }
    }

    return completed
      .map(a => {
        const meta = huntMeta.get(a.huntId);
        if (!meta) return null;
        const total = meta.totalStops || a.results.length;
        const decided = a.results.filter(r => !r.skipped);
        const correct = decided.filter(r => r.isCorrect).length;
        const scorePct = total > 0 ? correct / total : 0;
        const stopsCompleted = a.results.length;
        return {
          huntId: a.huntId,
          huntSlug: meta.slug,
          huntTitle: meta.title,
          coverEmoji: meta.coverEmoji,
          city: meta.city,
          tier: tierForScore(scorePct),
          scorePct,
          stopsCompleted,
          totalStops: total,
          earnedAt: a.completedAt!,
        } as EarnedBadge;
      })
      .filter((b): b is EarnedBadge => b !== null)
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
  },
};
