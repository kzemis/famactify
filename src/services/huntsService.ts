// SCV-01 Phase 0/1 — Scavenger Hunt service
// Reads seed hunts from static JSON, persists attempts in localStorage.
// When SCV-01 Phase 2 ships, swap the in-memory list for a Supabase fetch
// and persist attempts server-side (keep the same public surface).

import type { ScavengerHunt, HuntAttempt, HuntStopResult } from '@/types/hunt';
import { SEED_HUNTS } from '@/data/hunts';

const ATTEMPTS_KEY = 'famactify-hunt-attempts';

function loadAttempts(): HuntAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAttempts(list: HuntAttempt[]) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('storage'));
}

export const huntsService = {
  /** All published hunts (currently from static data). */
  async listHunts(opts: { countryCode?: string } = {}): Promise<ScavengerHunt[]> {
    return SEED_HUNTS.filter(h => !opts.countryCode || h.countryCode === opts.countryCode);
  },

  /** Get hunt by slug. */
  async getHunt(slug: string): Promise<ScavengerHunt | null> {
    return SEED_HUNTS.find(h => h.slug === slug) ?? null;
  },

  /** All attempts in storage. */
  listAttempts(): HuntAttempt[] {
    return loadAttempts();
  },

  /** Find any in-progress (not completed) attempt for a given hunt + profile. */
  findActiveAttempt(huntId: string, profileId: string): HuntAttempt | null {
    return loadAttempts().find(a => a.huntId === huntId && a.profileId === profileId && !a.completedAt) ?? null;
  },

  /** Find latest attempt for a hunt + profile (active or completed). */
  findLatestAttempt(huntId: string, profileId: string): HuntAttempt | null {
    const matches = loadAttempts().filter(a => a.huntId === huntId && a.profileId === profileId);
    return matches.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  },

  /** Start a new attempt or return the existing active one. */
  startAttempt(huntId: string, profileId: string): HuntAttempt {
    const existing = this.findActiveAttempt(huntId, profileId);
    if (existing) return existing;
    const attempts = loadAttempts();
    const fresh: HuntAttempt = {
      id: crypto.randomUUID(),
      huntId,
      profileId,
      startedAt: new Date().toISOString(),
      currentStopOrder: 0,
      results: [],
    };
    saveAttempts([...attempts, fresh]);
    return fresh;
  },

  /** Record a stop result, advance the attempt's current stop pointer. */
  recordStop(attemptId: string, stopResult: HuntStopResult, advance = true): HuntAttempt | null {
    const attempts = loadAttempts();
    const idx = attempts.findIndex(a => a.id === attemptId);
    if (idx === -1) return null;
    const a = attempts[idx];
    const otherResults = a.results.filter(r => r.stopId !== stopResult.stopId);
    const updated: HuntAttempt = {
      ...a,
      results: [...otherResults, stopResult],
      currentStopOrder: advance ? a.currentStopOrder + 1 : a.currentStopOrder,
    };
    attempts[idx] = updated;
    saveAttempts(attempts);
    return updated;
  },

  /** Mark attempt as complete. */
  completeAttempt(attemptId: string, tripId?: string): HuntAttempt | null {
    const attempts = loadAttempts();
    const idx = attempts.findIndex(a => a.id === attemptId);
    if (idx === -1) return null;
    attempts[idx] = { ...attempts[idx], completedAt: new Date().toISOString(), tripId };
    saveAttempts(attempts);
    return attempts[idx];
  },

  /** Quit / restart — drop active attempt for this hunt+profile. */
  abandonAttempt(attemptId: string): void {
    const attempts = loadAttempts().filter(a => a.id !== attemptId);
    saveAttempts(attempts);
  },

  /** Convenience: distance in metres between two lat/lon (Haversine). */
  distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  },
};

export type { ScavengerHunt, HuntAttempt, HuntStopResult };
