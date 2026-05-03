// SCV-01 — Scavenger Hunt service
// Phase 2: Supabase-backed reads + writes for hunts/stops/sponsors/attempts.
// Falls back to seed JSON when the Supabase result set is empty (Phase 0 hunts
// remain visible until at least one published hunt exists in DB).

import { supabase } from '@/integrations/supabase/client';
import type {
  ScavengerHunt,
  HuntStop,
  HuntPrompt,
  HuntAttempt,
  HuntStopResult,
  HuntSponsor,
} from '@/types/hunt';
import { SEED_HUNTS } from '@/data/hunts';

export type HuntPhotoReviewItem = {
  attemptId: string;
  huntId: string;
  huntTitle: string;
  huntSlug: string;
  stopId: string;
  stopTitle: string;
  profileId: string;
  photoDataUrl: string;
  photoSubject?: string;
  status: 'pending' | 'approved' | 'rejected';
  confidence?: number;
  answeredAt: string;
  reviewNotes?: string;
};

// ── localStorage fallback for guest attempts ─────────────────────────────────
const ATTEMPTS_KEY = 'famactify-hunt-attempts';

function loadLocalAttempts(): HuntAttempt[] {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalAttempts(list: HuntAttempt[]) {
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event('storage'));
}

// ── Mappers (DB row ↔ ScavengerHunt) ─────────────────────────────────────────

function mapHuntRow(row: any, stops: any[] = [], sponsors: any[] = []): ScavengerHunt {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    coverEmoji: row.cover_emoji ?? '🔍',
    coverImage: row.cover_image ?? undefined,
    hostName: row.host_name,
    hostLogo: row.host_logo ?? undefined,
    city: row.city,
    countryCode: row.country_code,
    primaryTheme: row.primary_theme,
    ageMin: row.age_min,
    ageMax: row.age_max,
    durationMinutes: row.duration_minutes,
    difficulty: row.difficulty,
    estCostCents: row.est_cost_cents ?? 0,
    distanceMeters: row.distance_meters ?? 0,
    credits: row.credits ?? undefined,
    publishedAt: row.published_at ?? row.created_at,
    stops: stops
      .sort((a, b) => a.stop_order - b.stop_order)
      .map(mapStopRow),
    sponsors: sponsors.map(mapSponsorRow),
  };
}

function mapStopRow(s: any): HuntStop {
  const prompt: HuntPrompt = {
    kind: s.prompt_kind,
    question: s.prompt_question,
    options: s.prompt_options ?? undefined,
    correctAnswers: s.prompt_correct ?? undefined,
    photoSubject: s.prompt_photo_subject ?? undefined,
  };
  return {
    id: s.id,
    order: s.stop_order,
    title: s.title,
    lat: s.lat,
    lon: s.lon,
    address: s.address ?? undefined,
    clueText: s.clue_text,
    clueImage: s.clue_image ?? undefined,
    clueAudio: s.clue_audio ?? undefined,
    parentHint: s.parent_hint ?? undefined,
    prompt,
    reveal: { funFact: s.reveal_fun_fact, image: s.reveal_image ?? undefined },
  };
}

function mapSponsorRow(s: any): HuntSponsor {
  return { name: s.name, logo: s.logo ?? undefined, url: s.url ?? undefined };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const huntsService = {
  /** Public — list published hunts. Falls back to seed data when DB is empty. */
  async listHunts(opts: { countryCode?: string } = {}): Promise<ScavengerHunt[]> {
    let query = supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (opts.countryCode) query = query.eq('country_code', opts.countryCode);
    const { data, error } = await query;
    if (error) {
      console.warn('[huntsService.listHunts] DB error, falling back to seed:', error.message);
      return SEED_HUNTS.filter(h => !opts.countryCode || h.countryCode === opts.countryCode);
    }
    if (!data || data.length === 0) {
      // Phase 0 fallback: show curated seed hunts so the feature isn't empty
      return SEED_HUNTS.filter(h => !opts.countryCode || h.countryCode === opts.countryCode);
    }
    return data.map((row: any) => mapHuntRow(row, row.hunt_stops ?? [], row.hunt_sponsors ?? []));
  },

  /** Public — get hunt by slug. Falls back to seed if not found in DB. */
  async getHunt(slug: string): Promise<ScavengerHunt | null> {
    const { data, error } = await supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();
    if (error) {
      console.warn('[huntsService.getHunt] DB error, falling back to seed:', error.message);
    }
    if (data) return mapHuntRow(data, data.hunt_stops ?? [], data.hunt_sponsors ?? []);
    return SEED_HUNTS.find(h => h.slug === slug) ?? null;
  },

  // ── Authoring (Phase 2) ────────────────────────────────────────────────────

  /** Org or admin — list hunts authored by current user (any status). */
  async listMyHunts(): Promise<ScavengerHunt[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    const { data, error } = await supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('created_by', user.user.id)
      .order('updated_at', { ascending: false });
    if (error) { console.error('[huntsService.listMyHunts]', error); return []; }
    return (data ?? []).map((r: any) => mapHuntRow(r, r.hunt_stops ?? [], r.hunt_sponsors ?? []));
  },

  /** Admin — list ALL hunts (any author, any status). RLS will filter to admin role in production. */
  async listAllHunts(opts: { status?: string } = {}): Promise<(ScavengerHunt & { status: string; createdBy: string | null; reviewNotes: string | null })[]> {
    let query = supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .order('updated_at', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    const { data, error } = await query;
    if (error) { console.error('[huntsService.listAllHunts]', error); return []; }
    return (data ?? []).map((r: any) => ({
      ...mapHuntRow(r, r.hunt_stops ?? [], r.hunt_sponsors ?? []),
      status: r.status,
      createdBy: r.created_by ?? null,
      reviewNotes: r.review_notes ?? null,
    }));
  },

  /** Get hunt by id including draft/pending state — for builder UI. */
  async getHuntById(id: string): Promise<(ScavengerHunt & { status: string; reviewNotes: string | null }) | null> {
    const { data, error } = await supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) { console.error('[huntsService.getHuntById]', error); return null; }
    if (!data) return null;
    return {
      ...mapHuntRow(data, data.hunt_stops ?? [], data.hunt_sponsors ?? []),
      status: data.status,
      reviewNotes: data.review_notes ?? null,
    };
  },

  /** Create a new draft hunt. Returns the new hunt id. */
  async createDraft(input: {
    slug: string;
    title: string;
    blurb: string;
    hostName: string;
    city: string;
    countryCode?: string;
    coverEmoji?: string;
    primaryTheme?: string;
    ageMin?: number;
    ageMax?: number;
    durationMinutes?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    credits?: string;
    orgId?: string | null;
  }): Promise<string> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Sign in to create hunts');
    const { data, error } = await supabase
      .from('hunts')
      .insert({
        slug: input.slug,
        title: input.title,
        blurb: input.blurb,
        host_name: input.hostName,
        city: input.city,
        country_code: input.countryCode ?? 'US',
        cover_emoji: input.coverEmoji ?? '🔍',
        primary_theme: input.primaryTheme ?? 'history',
        age_min: input.ageMin ?? 6,
        age_max: input.ageMax ?? 14,
        duration_minutes: input.durationMinutes ?? 120,
        difficulty: input.difficulty ?? 'easy',
        credits: input.credits ?? null,
        status: 'draft',
        created_by: user.user.id,
        org_id: input.orgId ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  /** Update top-level hunt fields. */
  async updateHunt(id: string, patch: Record<string, any>): Promise<void> {
    // Map camelCase patch keys to snake_case DB columns
    const map: Record<string, string> = {
      title: 'title', blurb: 'blurb', slug: 'slug',
      coverEmoji: 'cover_emoji', coverImage: 'cover_image',
      hostName: 'host_name', hostLogo: 'host_logo',
      city: 'city', countryCode: 'country_code',
      primaryTheme: 'primary_theme',
      ageMin: 'age_min', ageMax: 'age_max',
      durationMinutes: 'duration_minutes',
      difficulty: 'difficulty',
      estCostCents: 'est_cost_cents',
      distanceMeters: 'distance_meters',
      credits: 'credits',
    };
    const dbPatch: Record<string, any> = {};
    for (const k of Object.keys(patch)) {
      if (map[k]) dbPatch[map[k]] = patch[k];
    }
    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from('hunts').update(dbPatch).eq('id', id);
    if (error) throw error;
  },

  /** Replace all stops for a hunt with the given list (delete + insert). */
  async replaceStops(huntId: string, stops: HuntStop[]): Promise<void> {
    // Delete existing
    const { error: delErr } = await supabase.from('hunt_stops').delete().eq('hunt_id', huntId);
    if (delErr) throw delErr;
    if (stops.length === 0) return;
    const rows = stops.map((s, i) => ({
      hunt_id: huntId,
      stop_order: i,
      title: s.title,
      lat: s.lat,
      lon: s.lon,
      address: s.address ?? null,
      clue_text: s.clueText,
      clue_image: s.clueImage ?? null,
      clue_audio: s.clueAudio ?? null,
      parent_hint: s.parentHint ?? null,
      prompt_kind: s.prompt.kind,
      prompt_question: s.prompt.question,
      prompt_options: s.prompt.options ?? null,
      prompt_correct: s.prompt.correctAnswers ?? null,
      prompt_photo_subject: s.prompt.photoSubject ?? null,
      reveal_fun_fact: s.reveal.funFact,
      reveal_image: s.reveal.image ?? null,
    }));
    const { error: insErr } = await supabase.from('hunt_stops').insert(rows);
    if (insErr) throw insErr;
  },

  /** Replace all sponsors. */
  async replaceSponsors(huntId: string, sponsors: HuntSponsor[]): Promise<void> {
    const { error: delErr } = await supabase.from('hunt_sponsors').delete().eq('hunt_id', huntId);
    if (delErr) throw delErr;
    if (sponsors.length === 0) return;
    const rows = sponsors.map((s, i) => ({
      hunt_id: huntId,
      name: s.name,
      logo: s.logo ?? null,
      url: s.url ?? null,
      sort_order: i,
    }));
    const { error: insErr } = await supabase.from('hunt_sponsors').insert(rows);
    if (insErr) throw insErr;
  },

  /** Author submits draft for review. */
  async submitForReview(id: string): Promise<void> {
    const { error } = await supabase.from('hunts').update({ status: 'pending_review' }).eq('id', id);
    if (error) throw error;
  },

  /** Admin approves a hunt — sets status published + published_at. */
  async approve(id: string, reviewerId: string): Promise<void> {
    const { error } = await supabase
      .from('hunts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: null,
      })
      .eq('id', id);
    if (error) throw error;
  },

  /** Admin rejects a hunt — sets status rejected + notes. */
  async reject(id: string, reviewerId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('hunts')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes,
      })
      .eq('id', id);
    if (error) throw error;
  },

  /** Author deletes own draft hunt. */
  async deleteHunt(id: string): Promise<void> {
    const { error } = await supabase.from('hunts').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Sponsor logo upload (storage bucket: 'hunt-assets') ────────────────────

  /** Upload an image (sponsor logo / cover) to the hunt-assets bucket. Returns public URL. */
  async uploadAsset(file: File, pathPrefix = 'sponsors'): Promise<string> {
    const ext = file.name.split('.').pop() || 'png';
    const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('hunt-assets').upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('hunt-assets').getPublicUrl(path);
    return data.publicUrl;
  },

  // ── Attempts (DB for logged-in users, localStorage for guests) ─────────────

  /** Find latest attempt for a hunt + profile (active or completed). */
  async findLatestAttempt(huntId: string, profileId: string): Promise<HuntAttempt | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      const local = loadLocalAttempts().filter(a => a.huntId === huntId && a.profileId === profileId);
      return local.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
    }
    const { data, error } = await supabase
      .from('hunt_attempts')
      .select('*')
      .eq('hunt_id', huntId)
      .eq('profile_id', profileId)
      .eq('user_id', user.user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.warn('[findLatestAttempt]', error); return null; }
    if (!data) return null;
    return {
      id: data.id,
      huntId: data.hunt_id,
      profileId: data.profile_id,
      startedAt: data.started_at,
      completedAt: data.completed_at ?? undefined,
      currentStopOrder: data.current_stop_order,
      results: data.results ?? [],
      tripId: data.trip_id ?? undefined,
    };
  },

  async findActiveAttempt(huntId: string, profileId: string): Promise<HuntAttempt | null> {
    const a = await this.findLatestAttempt(huntId, profileId);
    return a && !a.completedAt ? a : null;
  },

  /** Start (or resume) an attempt. */
  async startAttempt(huntId: string, profileId: string): Promise<HuntAttempt> {
    const existing = await this.findActiveAttempt(huntId, profileId);
    if (existing) return existing;
    const { data: user } = await supabase.auth.getUser();
    const fresh: HuntAttempt = {
      id: crypto.randomUUID(),
      huntId,
      profileId,
      startedAt: new Date().toISOString(),
      currentStopOrder: 0,
      results: [],
    };
    if (!user.user) {
      saveLocalAttempts([...loadLocalAttempts(), fresh]);
      return fresh;
    }
    const { data, error } = await supabase
      .from('hunt_attempts')
      .insert({
        hunt_id: huntId, user_id: user.user.id, profile_id: profileId,
        current_stop_order: 0, results: [],
      })
      .select('*')
      .single();
    if (error) {
      console.warn('[startAttempt] DB insert failed, using local:', error.message);
      saveLocalAttempts([...loadLocalAttempts(), fresh]);
      return fresh;
    }
    return {
      id: data.id, huntId: data.hunt_id, profileId: data.profile_id,
      startedAt: data.started_at, currentStopOrder: data.current_stop_order, results: [],
    };
  },

  async recordStop(attemptId: string, stopResult: HuntStopResult, advance = true): Promise<HuntAttempt | null> {
    const { data: user } = await supabase.auth.getUser();

    // Local path (no auth)
    if (!user.user) {
      const list = loadLocalAttempts();
      const idx = list.findIndex(a => a.id === attemptId);
      if (idx === -1) return null;
      const a = list[idx];
      const others = a.results.filter(r => r.stopId !== stopResult.stopId);
      const updated: HuntAttempt = {
        ...a,
        results: [...others, stopResult],
        currentStopOrder: advance ? a.currentStopOrder + 1 : a.currentStopOrder,
      };
      list[idx] = updated;
      saveLocalAttempts(list);
      return updated;
    }

    // DB path — fetch, mutate, update
    const { data: existing, error: getErr } = await supabase
      .from('hunt_attempts').select('*').eq('id', attemptId).maybeSingle();
    if (getErr || !existing) return null;
    const others = (existing.results ?? []).filter((r: any) => r.stopId !== stopResult.stopId);
    const newResults = [...others, stopResult];
    const newOrder = advance ? existing.current_stop_order + 1 : existing.current_stop_order;
    const { data: updated, error: updErr } = await supabase
      .from('hunt_attempts')
      .update({ results: newResults, current_stop_order: newOrder })
      .eq('id', attemptId)
      .select('*').single();
    if (updErr) return null;
    return {
      id: updated.id, huntId: updated.hunt_id, profileId: updated.profile_id,
      startedAt: updated.started_at, completedAt: updated.completed_at ?? undefined,
      currentStopOrder: updated.current_stop_order, results: updated.results ?? [],
      tripId: updated.trip_id ?? undefined,
    };
  },

  async completeAttempt(attemptId: string, tripId?: string): Promise<HuntAttempt | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      const list = loadLocalAttempts();
      const idx = list.findIndex(a => a.id === attemptId);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], completedAt: new Date().toISOString(), tripId };
      saveLocalAttempts(list);
      return list[idx];
    }
    const { data, error } = await supabase
      .from('hunt_attempts')
      .update({ completed_at: new Date().toISOString(), trip_id: tripId ?? null })
      .eq('id', attemptId).select('*').single();
    if (error) return null;
    return {
      id: data.id, huntId: data.hunt_id, profileId: data.profile_id,
      startedAt: data.started_at, completedAt: data.completed_at,
      currentStopOrder: data.current_stop_order, results: data.results ?? [],
      tripId: data.trip_id ?? undefined,
    };
  },

  async abandonAttempt(attemptId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      saveLocalAttempts(loadLocalAttempts().filter(a => a.id !== attemptId));
      return;
    }
    await supabase.from('hunt_attempts').delete().eq('id', attemptId);
  },

  /** All attempts for a given profile (DB for logged-in users; localStorage for guests). */
  async listAttemptsForProfile(profileId: string): Promise<HuntAttempt[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      return loadLocalAttempts().filter(a => a.profileId === profileId);
    }
    const { data, error } = await supabase
      .from('hunt_attempts')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      huntId: r.hunt_id,
      profileId: r.profile_id,
      startedAt: r.started_at,
      completedAt: r.completed_at ?? undefined,
      currentStopOrder: r.current_stop_order,
      results: r.results ?? [],
      tripId: r.trip_id ?? undefined,
    }));
  },

  /** Admin — list photo answers needing manual verification. */
  async listPhotoReviews(status: 'pending' | 'all' = 'pending'): Promise<HuntPhotoReviewItem[]> {
    const { data, error } = await supabase
      .from('hunt_attempts')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(200);
    if (error || !data) {
      console.warn('[huntsService.listPhotoReviews]', error?.message);
      return [];
    }

    const huntIds = Array.from(new Set((data as any[]).map(a => a.hunt_id).filter(Boolean)));
    const huntMap = new Map<string, ScavengerHunt>();
    await Promise.all(huntIds.map(async id => {
      const hunt = await this.getHuntById(id).catch(() => null);
      if (hunt) huntMap.set(id, hunt);
    }));

    const items: HuntPhotoReviewItem[] = [];
    for (const attempt of data as any[]) {
      const hunt = huntMap.get(attempt.hunt_id);
      const results = (attempt.results ?? []) as HuntStopResult[];
      for (const result of results) {
        if (!result.photoDataUrl) continue;
        const reviewStatus =
          result.photoReviewStatus ??
          (result.photoVerified === true ? 'approved' : result.photoVerified === false ? 'pending' : 'pending');
        if (status === 'pending' && reviewStatus !== 'pending') continue;
        const stop = hunt?.stops.find(s => s.id === result.stopId);
        items.push({
          attemptId: attempt.id,
          huntId: attempt.hunt_id,
          huntTitle: hunt?.title ?? 'Unknown hunt',
          huntSlug: hunt?.slug ?? attempt.hunt_id,
          stopId: result.stopId,
          stopTitle: stop?.title ?? 'Photo stop',
          profileId: attempt.profile_id,
          photoDataUrl: result.photoDataUrl,
          photoSubject: stop?.prompt.photoSubject,
          status: reviewStatus,
          confidence: result.photoVerifyConfidence,
          answeredAt: result.answeredAt,
          reviewNotes: result.photoReviewNotes,
        });
      }
    }
    return items.sort((a, b) => b.answeredAt.localeCompare(a.answeredAt));
  },

  /** Admin — approve or reject a photo result inside an attempt's JSONB results. */
  async reviewPhoto(input: {
    attemptId: string;
    stopId: string;
    status: 'approved' | 'rejected';
    reviewerId: string;
    notes?: string;
  }): Promise<void> {
    const { data: attempt, error: getErr } = await supabase
      .from('hunt_attempts')
      .select('*')
      .eq('id', input.attemptId)
      .maybeSingle();
    if (getErr || !attempt) throw getErr ?? new Error('Attempt not found');

    const results = ((attempt as any).results ?? []) as HuntStopResult[];
    const nextResults = results.map(result => {
      if (result.stopId !== input.stopId) return result;
      return {
        ...result,
        photoVerified: input.status === 'approved',
        photoNeedsReview: false,
        photoReviewStatus: input.status,
        photoReviewNotes: input.notes,
        photoReviewedAt: new Date().toISOString(),
        photoReviewedBy: input.reviewerId,
      } satisfies HuntStopResult;
    });

    const { error: updErr } = await supabase
      .from('hunt_attempts')
      .update({ results: nextResults })
      .eq('id', input.attemptId);
    if (updErr) throw updErr;
  },

  /**
   * Photo verification stub.
   *
   * This is intentionally not a fake ML classifier. It creates a stable seam for
   * a future model and marks photos as needing manual review today.
   *
   * Future swaps (no API change required for callers):
   *   - CLIP/text-image similarity (browser via transformers.js, or server route)
   *   - Edge Function that calls a hosted vision model
   *   - Manual admin review queue (returns false, needsReview:true)
   */
  async verifyPhotoML(_photoDataUrl: string, _subject: string | undefined): Promise<{ verified: boolean; confidence: number; needsReview?: boolean }> {
    return { verified: false, confidence: 0, needsReview: true };
  },

  /** Haversine distance in metres. */
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
