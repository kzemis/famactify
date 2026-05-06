// SCV-01 — Scavenger Hunt service
// Phase 2: Supabase-backed reads + writes for hunts/stops/sponsors/attempts.
// Public reads merge DB hunts with seed JSON so hand-authored Phase 0/1 hunts
// remain visible until they are explicitly imported into Supabase.

import { supabase } from '@/integrations/supabase/client';
import { flags } from '@/lib/flags';
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

export type AdminHuntListItem = ScavengerHunt & {
  status: string;
  createdBy: string | null;
  reviewNotes: string | null;
  adminSource: 'db' | 'seed';
  seedId?: string;
};

// ── localStorage fallback for guest attempts ─────────────────────────────────
const ATTEMPTS_KEY = 'famactify-hunt-attempts';
const SEED_ADMIN_ID_PREFIX = 'seed:';

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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function seedAdminId(slug: string): string {
  return `${SEED_ADMIN_ID_PREFIX}${slug}`;
}

function findSeedHuntByEditableId(id: string): ScavengerHunt | null {
  if (id.startsWith(SEED_ADMIN_ID_PREFIX)) {
    const slug = id.slice(SEED_ADMIN_ID_PREFIX.length);
    return SEED_HUNTS.find(h => h.slug === slug) ?? null;
  }
  return SEED_HUNTS.find(h => h.id === id || h.slug === id) ?? null;
}

function mapSeedAdminHunt(hunt: ScavengerHunt, preservePublicId = false): AdminHuntListItem {
  return {
    ...hunt,
    id: preservePublicId ? hunt.id : seedAdminId(hunt.slug),
    status: 'published',
    createdBy: null,
    reviewNotes: null,
    adminSource: 'seed',
    seedId: hunt.id,
  };
}

function findLocalAttemptIndex(attemptId: string): { list: HuntAttempt[]; index: number } {
  const list = loadLocalAttempts();
  return { list, index: list.findIndex(a => a.id === attemptId) };
}

function latestLocalAttempt(huntId: string, profileId: string): HuntAttempt | null {
  const matches = loadLocalAttempts().filter(a => a.huntId === huntId && a.profileId === profileId);
  return matches.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

function updateLocalAttempt(attemptId: string, updater: (attempt: HuntAttempt) => HuntAttempt): HuntAttempt | null {
  const { list, index } = findLocalAttemptIndex(attemptId);
  if (index === -1) return null;
  const updated = updater(list[index]);
  list[index] = updated;
  saveLocalAttempts(list);
  return updated;
}

const OPTIONAL_HUNT_STOP_COLUMNS = [
  'prompt_metadata',
  'prompt_reference_image',
] as const;

// Cache the column probe result so we don't hit Supabase 3× on every save.
let _unavailableCache: Set<string> | null = null;
let _unavailableCacheTs = 0;
const COLUMN_CACHE_TTL = 5 * 60_000; // 5 min

function missingSchemaColumnName(error: any): string | null {
  const text = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.hint ?? ''} ${error?.code ?? ''}`;
  // PostgREST schema-cache format: Could not find the 'col' column …
  const singleQuoted = text.match(/'([^']+)' column/i);
  if (singleQuoted) return singleQuoted[1];
  // PostgreSQL format: column "col" of relation … does not exist
  const doubleQuoted = text.match(/column "([^"]+)"/i);
  if (doubleQuoted) return doubleQuoted[1];
  // Supabase/PostgREST dot-prefixed: column table.col does not exist
  const dotPrefixed = text.match(/column \w+\.(\w+)/i);
  if (dotPrefixed) return dotPrefixed[1];
  // Bare format: column col does not exist
  const bare = text.match(/column (\w+) does not exist/i);
  if (bare) return bare[1];
  return null;
}

function withoutColumns(rows: Record<string, any>[], columns: Set<string>): Record<string, any>[] {
  if (columns.size === 0) return rows;
  return rows.map(row => {
    const next = { ...row };
    for (const columnName of columns) delete next[columnName];
    return next;
  });
}

async function unavailableOptionalStopColumns(): Promise<Set<string>> {
  // Return cached result if fresh
  if (_unavailableCache && Date.now() - _unavailableCacheTs < COLUMN_CACHE_TTL) {
    return new Set(_unavailableCache);
  }

  const unavailable = new Set<string>();

  for (const columnName of OPTIONAL_HUNT_STOP_COLUMNS) {
    const { error } = await supabase.from('hunt_stops').select(columnName).limit(1);
    if (!error) continue;

    // If the error mentions this column OR any column-not-found pattern,
    // treat it as unavailable rather than throwing — these are optional columns.
    const parsed = missingSchemaColumnName(error);
    if (parsed === columnName) {
      unavailable.add(columnName);
      continue;
    }

    // Fallback: if the error message contains this column name at all,
    // or looks like a schema/column error, assume it's unavailable.
    const errText = `${error?.message ?? ''} ${error?.details ?? ''} ${error?.code ?? ''}`;
    if (
      errText.includes(columnName)
      || error?.code === '42703'   // PostgreSQL: undefined_column
      || error?.code === 'PGRST204' // PostgREST: column not found
    ) {
      console.warn(`[huntsService] Optional column '${columnName}' unavailable:`, error.message);
      unavailable.add(columnName);
      continue;
    }

    throw error;
  }

  _unavailableCache = unavailable;
  _unavailableCacheTs = Date.now();
  return new Set(unavailable);
}

// ── Mappers (DB row ↔ ScavengerHunt) ─────────────────────────────────────────

function mapHuntRow(row: any, stops: any[] = [], sponsors: any[] = []): ScavengerHunt {
  const hunt: ScavengerHunt = {
    id: row.id,
    slug: row.slug,
    artifactKind: row.artifact_kind ?? 'scavenger_hunt',
    artifactVersion: row.artifact_version ?? 1,
    createdVia: row.created_via ?? 'human',
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
    sourceLinks: row.source_links ?? undefined,
    aiPrompt: row.ai_prompt ?? undefined,
    generationNotes: row.generation_notes ?? undefined,
    publishedAt: row.published_at ?? row.created_at,
    stops: stops
      .sort((a, b) => a.stop_order - b.stop_order)
      .map(mapStopRow),
    sponsors: sponsors.map(mapSponsorRow),
  };

  if (hunt.stops.length === 0) {
    const seedHunt = SEED_HUNTS.find(seed => seed.slug === hunt.slug);
    if (seedHunt) {
      return {
        ...hunt,
        stops: seedHunt.stops,
        sponsors: hunt.sponsors.length > 0 ? hunt.sponsors : seedHunt.sponsors,
      };
    }
  }

  return hunt;
}

function mapStopRow(s: any): HuntStop {
  const metadata = s.prompt_metadata ?? {};
  const prompt: HuntPrompt = {
    kind: s.prompt_kind,
    question: s.prompt_question,
    options: s.prompt_options ?? undefined,
    correctAnswers: s.prompt_correct ?? undefined,
    photoSubject: s.prompt_photo_subject ?? undefined,
    referenceImage: s.prompt_reference_image ?? undefined,
    audioSubject: metadata.audioSubject ?? undefined,
    audioMaxSeconds: metadata.audioMaxSeconds ?? undefined,
    drawingSubject: metadata.drawingSubject ?? undefined,
    timeTravelImageUrl: metadata.timeTravelImageUrl ?? undefined,
    timeTravelCaption: metadata.timeTravelCaption ?? undefined,
    timeTravelOpacity: metadata.timeTravelOpacity ?? undefined,
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

function promptMetadata(prompt: HuntPrompt): Record<string, unknown> {
  return {
    audioSubject: prompt.audioSubject ?? null,
    audioMaxSeconds: prompt.audioMaxSeconds ?? null,
    drawingSubject: prompt.drawingSubject ?? null,
    timeTravelImageUrl: prompt.timeTravelImageUrl ?? null,
    timeTravelCaption: prompt.timeTravelCaption ?? null,
    timeTravelOpacity: prompt.timeTravelOpacity ?? null,
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const huntsService = {
  /** Public — list published hunts. Merges DB rows with seed data by slug. */
  async listHunts(opts: { countryCode?: string } = {}): Promise<ScavengerHunt[]> {
    const seedHunts = SEED_HUNTS.filter(h => !opts.countryCode || h.countryCode === opts.countryCode);
    let query = supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (opts.countryCode) query = query.eq('country_code', opts.countryCode);
    const { data, error } = await query;
    if (error) {
      console.warn('[huntsService.listHunts] DB error, falling back to seed:', error.message);
      return seedHunts;
    }
    const dbHunts = (data ?? []).map((row: any) => mapHuntRow(row, row.hunt_stops ?? [], row.hunt_sponsors ?? []));
    const dbSlugs = new Set(dbHunts.map(h => h.slug));
    const missingSeedHunts = seedHunts.filter(h => !dbSlugs.has(h.slug));
    return [...dbHunts, ...missingSeedHunts];
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
  async listAllHunts(opts: { status?: string; countryCode?: string; includeSeedHunts?: boolean } = {}): Promise<AdminHuntListItem[]> {
    const includeSeeds = opts.includeSeedHunts !== false && (!opts.status || opts.status === 'published');
    const seedHuntsForFilter = () => SEED_HUNTS
      .filter(h => !opts.countryCode || h.countryCode === opts.countryCode)
      .map(h => mapSeedAdminHunt(h));

    let query = supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .order('updated_at', { ascending: false });
    if (opts.status) query = query.eq('status', opts.status);
    if (opts.countryCode) query = query.eq('country_code', opts.countryCode);
    const { data, error } = await query;
    if (error) {
      console.error('[huntsService.listAllHunts]', error);
      return includeSeeds ? seedHuntsForFilter() : [];
    }
    const dbHunts: AdminHuntListItem[] = (data ?? []).map((r: any) => ({
      ...mapHuntRow(r, r.hunt_stops ?? [], r.hunt_sponsors ?? []),
      status: r.status,
      createdBy: r.created_by ?? null,
      reviewNotes: r.review_notes ?? null,
      adminSource: 'db',
    }));
    if (!includeSeeds) return dbHunts;

    const dbSlugs = new Set(dbHunts.map(h => h.slug));
    const seedHunts = seedHuntsForFilter()
      .filter(h => !dbSlugs.has(h.slug));

    return [...dbHunts, ...seedHunts];
  },

  /** Get hunt by id including draft/pending state — for builder UI. */
  async getHuntById(id: string): Promise<AdminHuntListItem | null> {
    const seedByEditableId = findSeedHuntByEditableId(id);
    if (id.startsWith(SEED_ADMIN_ID_PREFIX)) {
      return seedByEditableId ? mapSeedAdminHunt(seedByEditableId) : null;
    }
    if (!isUuid(id)) {
      return seedByEditableId ? mapSeedAdminHunt(seedByEditableId, true) : null;
    }

    const { data, error } = await supabase
      .from('hunts')
      .select('*, hunt_stops(*), hunt_sponsors(*)')
      .eq('id', id)
      .maybeSingle();
    if (error) { console.error('[huntsService.getHuntById]', error); return null; }
    if (!data) return seedByEditableId ? mapSeedAdminHunt(seedByEditableId, true) : null;
    return {
      ...mapHuntRow(data, data.hunt_stops ?? [], data.hunt_sponsors ?? []),
      status: data.status,
      reviewNotes: data.review_notes ?? null,
      createdBy: data.created_by ?? null,
      adminSource: 'db',
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
    coverImage?: string;
    primaryTheme?: string;
    ageMin?: number;
    ageMax?: number;
    durationMinutes?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    credits?: string;
    createdVia?: 'human' | 'ai_assisted' | 'ai_generated';
    sourceLinks?: string[];
    aiPrompt?: string;
    generationNotes?: string;
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
        cover_image: input.coverImage ?? null,
        primary_theme: input.primaryTheme ?? 'history',
        age_min: input.ageMin ?? 6,
        age_max: input.ageMax ?? 14,
        duration_minutes: input.durationMinutes ?? 120,
        difficulty: input.difficulty ?? 'easy',
        credits: input.credits ?? null,
        artifact_kind: 'scavenger_hunt',
        artifact_version: 1,
        created_via: input.createdVia ?? 'human',
        source_links: input.sourceLinks ?? [],
        ai_prompt: input.aiPrompt ?? null,
        generation_notes: input.generationNotes ?? null,
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
      artifactKind: 'artifact_kind',
      artifactVersion: 'artifact_version',
      createdVia: 'created_via',
      sourceLinks: 'source_links',
      aiPrompt: 'ai_prompt',
      generationNotes: 'generation_notes',
    };
    const dbPatch: Record<string, any> = {};
    for (const k of Object.keys(patch)) {
      if (map[k]) dbPatch[map[k]] = patch[k];
    }
    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from('hunts').update(dbPatch).eq('id', id);
    if (error) throw error;
  },

  /** Replace all stops for a hunt with the given list. */
  async replaceStops(huntId: string, stops: HuntStop[]): Promise<void> {
    const unavailableColumns = await unavailableOptionalStopColumns();

    if (stops.length === 0) {
      const { error: deleteAllError } = await supabase.from('hunt_stops').delete().eq('hunt_id', huntId);
      if (deleteAllError) throw deleteAllError;
      return;
    }

    const rows = stops.map((stop, index) => ({
      hunt_id: huntId,
      stop_order: index,
      title: stop.title,
      lat: stop.lat,
      lon: stop.lon,
      address: stop.address ?? null,
      clue_text: stop.clueText,
      clue_image: stop.clueImage ?? null,
      clue_audio: stop.clueAudio ?? null,
      parent_hint: stop.parentHint ?? null,
      prompt_kind: stop.prompt.kind,
      prompt_question: stop.prompt.question,
      prompt_options: stop.prompt.options ?? null,
      prompt_correct: stop.prompt.correctAnswers ?? null,
      prompt_photo_subject: stop.prompt.photoSubject ?? null,
      prompt_reference_image: stop.prompt.referenceImage ?? null,
      prompt_metadata: promptMetadata(stop.prompt),
      reveal_fun_fact: stop.reveal.funFact,
      reveal_image: stop.reveal.image ?? null,
    }));

    let rowsToInsert = withoutColumns(rows, unavailableColumns);
    for (let attempt = 0; attempt <= OPTIONAL_HUNT_STOP_COLUMNS.length; attempt += 1) {
      const { error: upsertError } = await supabase
        .from('hunt_stops')
        .upsert(rowsToInsert, { onConflict: 'hunt_id,stop_order' });
      if (!upsertError) {
        const { error: deleteExtraError } = await supabase
          .from('hunt_stops')
          .delete()
          .eq('hunt_id', huntId)
          .gte('stop_order', stops.length);
        if (deleteExtraError) throw deleteExtraError;
        return;
      }

      const missingColumn = missingSchemaColumnName(upsertError);
      if (
        missingColumn
        && OPTIONAL_HUNT_STOP_COLUMNS.includes(missingColumn as typeof OPTIONAL_HUNT_STOP_COLUMNS[number])
        && !unavailableColumns.has(missingColumn)
      ) {
        unavailableColumns.add(missingColumn);
        _unavailableCache = null; // invalidate cache — schema changed
        rowsToInsert = withoutColumns(rows, unavailableColumns);
        continue;
      }

      throw upsertError;
    }
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

  // ── Hunt asset upload (storage bucket: 'hunt-assets') ─────────────────────

  /** Upload a public hunt asset (sponsor logo, cover, step audio guide). Returns public URL. */
  async uploadAsset(file: File, pathPrefix = 'sponsors'): Promise<string> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error('Sign in to upload hunt assets');

    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const safePrefix = pathPrefix
      .replace(/[^a-z0-9/_-]/gi, '-')
      .replace(/^\/+|\/+$/g, '') || 'assets';
    const path = `${user.id}/${safePrefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('hunt-assets').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from('hunt-assets').getPublicUrl(path);
    return data.publicUrl;
  },

  // ── Attempts (DB for logged-in users, localStorage for guests) ─────────────

  /** Find latest attempt for a hunt + profile (active or completed). */
  async findLatestAttempt(huntId: string, profileId: string): Promise<HuntAttempt | null> {
    const { data: user } = await supabase.auth.getUser();
    const local = latestLocalAttempt(huntId, profileId);

    // Static seed hunts use string ids/slugs, while Supabase hunt_attempts.hunt_id
    // is UUID. Keep those attempts fully local even for signed-in users.
    if (!user.user || !isUuid(huntId)) return local;

    const { data, error } = await supabase
      .from('hunt_attempts')
      .select('*')
      .eq('hunt_id', huntId)
      .eq('profile_id', profileId)
      .eq('user_id', user.user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.warn('[findLatestAttempt]', error); return local; }
    if (!data) return local;
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
    if (!user.user || !isUuid(huntId)) {
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
    const isAdvanceOnly = stopResult.answer === '__advance__';

    const localMatch = findLocalAttemptIndex(attemptId);
    if (localMatch.index !== -1) {
      const a = localMatch.list[localMatch.index];
      const updated: HuntAttempt = {
        ...a,
        results: isAdvanceOnly
          ? a.results
          : [...a.results.filter(r => r.stopId !== stopResult.stopId), stopResult],
        currentStopOrder: advance ? a.currentStopOrder + 1 : a.currentStopOrder,
      };
      localMatch.list[localMatch.index] = updated;
      saveLocalAttempts(localMatch.list);
      return updated;
    }

    // Local path (no auth)
    if (!user.user) {
      return null;
    }

    // DB path — fetch, mutate, update
    const { data: existing, error: getErr } = await supabase
      .from('hunt_attempts').select('*').eq('id', attemptId).maybeSingle();
    if (getErr || !existing) return null;
    const existingResults = (existing.results ?? []) as HuntStopResult[];
    const newResults = isAdvanceOnly
      ? existingResults
      : [...existingResults.filter(r => r.stopId !== stopResult.stopId), stopResult];
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
    const local = updateLocalAttempt(attemptId, attempt => ({ ...attempt, completedAt: new Date().toISOString(), tripId }));
    if (local) return local;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
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
    const { list, index } = findLocalAttemptIndex(attemptId);
    if (index !== -1) {
      saveLocalAttempts(list.filter(a => a.id !== attemptId));
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    await supabase.from('hunt_attempts').delete().eq('id', attemptId);
  },

  /** All attempts for a given profile (DB for logged-in users; localStorage for guests). */
  async listAttemptsForProfile(profileId: string): Promise<HuntAttempt[]> {
    const { data: user } = await supabase.auth.getUser();
    const localAttempts = loadLocalAttempts().filter(a => a.profileId === profileId);
    if (!user.user) {
      return localAttempts;
    }
    const { data, error } = await supabase
      .from('hunt_attempts')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('profile_id', profileId)
      .order('started_at', { ascending: false });
    if (error || !data) return localAttempts;
    const dbAttempts = data.map((r: any) => ({
      id: r.id,
      huntId: r.hunt_id,
      profileId: r.profile_id,
      startedAt: r.started_at,
      completedAt: r.completed_at ?? undefined,
      currentStopOrder: r.current_stop_order,
      results: r.results ?? [],
      tripId: r.trip_id ?? undefined,
    }));
    return [...dbAttempts, ...localAttempts].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
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

  async verifyPhotoML(photoDataUrl: string, subject: string | undefined): Promise<{ verified: boolean; confidence: number; needsReview?: boolean; reason?: string; model?: string }> {
    if (!flags.scv_ml_photo_verification) {
      return {
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: 'ML photo verification is disabled; saved for manual review.',
      };
    }

    if (!subject?.trim()) {
      return { verified: false, confidence: 0, needsReview: true, reason: 'No photo subject was configured for this stop.' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-hunt-photo', {
        body: {
          imageDataUrl: photoDataUrl,
          photoSubject: subject,
          threshold: 0.72,
        },
      });
      if (error) throw error;
      return {
        verified: !!data?.verified,
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
        needsReview: data?.needsReview ?? !data?.verified,
        reason: data?.reason,
        model: data?.model,
      };
    } catch (error: any) {
      console.warn('[huntsService.verifyPhotoML] Falling back to manual review:', error?.message || error);
      return {
        verified: false,
        confidence: 0,
        needsReview: true,
        reason: error?.message || 'ML verification unavailable; queued for manual review.',
      };
    }
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
