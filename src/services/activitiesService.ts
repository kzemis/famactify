import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';

type ActivitySpotBase = Database['public']['Tables']['activityspots']['Row'];

export interface ActivitySpot extends ActivitySpotBase {
  primary_category: string | null;
  involvement: string | null;
  city: string | null;
  demo_enabled: boolean | null;
  demo_rank: number | null;
  age_min: number | null;
  age_max: number | null;
  rain_suitable: boolean | null;
  booking_required: boolean | null;
  tags: string[] | null;
  highlights: string[] | null;
  excitement_score: number | null;
  country_code: string | null;
  sensory_friendly: boolean | null;
  transit_accessible: boolean | null;
  fenced: boolean | null;
  ticket_url: string | null;
  organizer: string | null;
  json: Json;
}

export interface SlimActivity {
  id: string;
  name: string;
  location_lat: number | null;
  location_lon: number | null;
  location_address: string | null;
  imageurlthumb: string | null;
  min_price: number | null;
  max_price: number | null;
  duration_minutes: number | null;
  age_buckets: string[] | null;
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
  primary_category: string | null;
  location_environment: string | null;
  activity_type: string[] | null;
  tags: string[] | null;
}

export type TimingFilter = 'any' | 'now' | 'today' | 'tomorrow' | 'weekend';
export type DurationFilter = 'any' | '<60' | '60-120' | '120-240' | '240+';

export interface ActivityFilters {
  countryCode: string;
  searchQuery?: string;
  selectedCategories?: string[];
  selectedAges?: string[];
  selectedInvolvement?: string;
  maxPrice?: 'any' | 'free' | '10' | '20' | string;
  indoorOnly?: boolean;
  rainSuitable?: boolean;
  wheelchairAccessible?: boolean;
  strollerFriendly?: boolean;
  sensoryFriendly?: boolean;
  transitAccessible?: boolean;
  fencedArea?: boolean;
  eventsOnly?: boolean;
  timingFilter?: TimingFilter;
  durationFilter?: DurationFilter;
  selectedCities?: string[];
  curatedActivityIds?: string[];
}

export interface LocationPoint {
  lat: number;
  lon: number;
}

export interface FetchActivitiesOptions {
  page?: number;
  pageSize?: number;
  mapLimit?: number;
  userLocation?: LocationPoint | null;
  nearbyKm?: number | null;
}

export interface FetchActivitiesResult {
  activities: ActivitySpot[];
  mapActivities: SlimActivity[];
  totalCount: number;
  hasMore: boolean;
  center: LocationPoint;
}

export interface PlannerActivity {
  id: string;
  name: string;
  imageurlthumb: string | null;
  duration_minutes: number | null;
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  age_buckets: string[];
  description: string | null;
}

export interface PlanActivity {
  id: string;
  name: string;
  duration_minutes: number | null;
  min_price: number | null;
  max_price: number | null;
  location_address: string | null;
  location_lat: number | null;
  location_lon: number | null;
  imageurlthumb: string | null;
}

export interface DemoActivityAdminRow {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  country_code: string | null;
  imageurlthumb: string | null;
  location_address: string | null;
  primary_category: string | null;
  source: string | null;
  urlmoreinfo_status: string | null;
  excitement_score: number | null;
  demo_enabled: boolean;
  demo_rank: number | null;
  created_at: string;
}

export type DemoActivityEnabledFilter = 'all' | 'enabled' | 'disabled';

export interface DemoActivityAdminFilters {
  countryCode?: string;
  enabled?: DemoActivityEnabledFilter;
  searchQuery?: string;
  limit?: number;
}

export const ACTIVITY_PAGE_SIZE = 50;

export const GRID_COLUMNS = [
  'id', 'name', 'description', 'primary_category', 'activity_type', 'age_buckets',
  'location_address', 'location_lat', 'location_lon', 'imageurlthumb', 'urlmoreinfo', 'urlmoreinfo_status',
  'min_price', 'max_price', 'involvement', 'location_environment', 'rain_suitable',
  'booking_required', 'tags', 'duration_minutes', 'excitement_score', 'country_code',
  'accessibility_wheelchair', 'accessibility_stroller', 'sensory_friendly',
  'transit_accessible', 'fenced', 'event_starttime', 'event_endtime',
  'ticket_url', 'organizer', 'created_at', 'city', 'age_min', 'age_max',
  'facilities_restrooms', 'foodvenue_kidamenities', 'foodvenue_kidcorner',
  'foodvenue_kidmenu', 'source', 'created_by', 'demo_enabled', 'demo_rank', 'json',
].join(', ');

export const MAP_COLUMNS = [
  'id', 'name', 'location_lat', 'location_lon', 'location_address',
  'imageurlthumb', 'min_price', 'max_price', 'duration_minutes', 'age_buckets', 'urlmoreinfo', 'urlmoreinfo_status',
  'primary_category', 'location_environment', 'activity_type', 'tags',
].join(', ');

const PLAN_COLUMNS = 'id, name, duration_minutes, min_price, max_price, location_address, location_lat, location_lon, imageurlthumb';
const PLANNER_COLUMNS = 'id, name, imageurlthumb, duration_minutes, min_price, max_price, location_address, age_buckets, description';
const ADMIN_DEMO_COLUMNS = [
  'id', 'name', 'description', 'city', 'country_code', 'imageurlthumb', 'location_address',
  'primary_category', 'source', 'urlmoreinfo_status', 'excitement_score',
  'demo_enabled', 'demo_rank', 'created_at',
].join(', ');

function fallbackCenter(countryCode: string): LocationPoint {
  return countryCode === 'US'
    ? { lat: 37.7749, lon: -122.4194 }
    : { lat: 56.9496, lon: 24.1052 };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function applyActivityFilters(query: any, filters: ActivityFilters): any {
  const now = new Date();
  const nowIso = now.toISOString();
  const timingFilter = filters.timingFilter ?? 'any';
  const durationFilter = filters.durationFilter ?? 'any';

  let q = query
    .eq('country_code', filters.countryCode)
    .eq('demo_enabled', true)
    .or(`event_endtime.is.null,event_endtime.gt.${nowIso}`);

  if (filters.eventsOnly) {
    q = q.not('event_starttime', 'is', null).gt('event_starttime', nowIso);
  }

  if (timingFilter !== 'any') {
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(todayEnd); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999);
    const daysToSaturday = now.getDay() === 0 ? 6 : 6 - now.getDay();
    const weekendStart = new Date(now); weekendStart.setDate(weekendStart.getDate() + daysToSaturday); weekendStart.setHours(0, 0, 0, 0);
    const weekendEnd = new Date(weekendStart); weekendEnd.setDate(weekendEnd.getDate() + 1); weekendEnd.setHours(23, 59, 59, 999);
    const twoHours = new Date(now.getTime() + 2 * 3600_000);

    const ranges: Record<string, string> = {
      now: `event_starttime.is.null,and(event_starttime.gte.${nowIso},event_starttime.lte.${twoHours.toISOString()})`,
      today: `event_starttime.is.null,and(event_starttime.gte.${todayStart.toISOString()},event_starttime.lte.${todayEnd.toISOString()})`,
      tomorrow: `event_starttime.is.null,and(event_starttime.gte.${tomorrowStart.toISOString()},event_starttime.lte.${tomorrowEnd.toISOString()})`,
      weekend: `event_starttime.is.null,and(event_starttime.gte.${weekendStart.toISOString()},event_starttime.lte.${weekendEnd.toISOString()})`,
    };
    if (ranges[timingFilter]) q = q.or(ranges[timingFilter]);
  }

  if (durationFilter !== 'any') {
    const durationRanges: Record<string, string> = {
      '<60': 'duration_minutes.is.null,duration_minutes.lt.60',
      '60-120': 'duration_minutes.is.null,and(duration_minutes.gte.60,duration_minutes.lte.120)',
      '120-240': 'duration_minutes.is.null,and(duration_minutes.gt.120,duration_minutes.lte.240)',
      '240+': 'duration_minutes.is.null,duration_minutes.gt.240',
    };
    if (durationRanges[durationFilter]) q = q.or(durationRanges[durationFilter]);
  }

  const searchQuery = filters.searchQuery?.trim();
  if (searchQuery) q = q.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location_address.ilike.%${searchQuery}%`);
  if (filters.selectedCategories?.length) q = q.in('primary_category', filters.selectedCategories);
  if (filters.selectedAges?.length) q = q.overlaps('age_buckets', filters.selectedAges);
  if (filters.selectedInvolvement) q = q.eq('involvement', filters.selectedInvolvement);

  if (filters.maxPrice === 'free') q = q.or('min_price.eq.0,min_price.is.null');
  else if (filters.maxPrice === '10') q = q.or('min_price.lte.10,min_price.is.null');
  else if (filters.maxPrice === '20') q = q.or('min_price.lte.20,min_price.is.null');

  if (filters.indoorOnly) q = q.in('location_environment', ['indoor', 'both']);
  if (filters.rainSuitable) q = q.eq('rain_suitable', true);
  if (filters.wheelchairAccessible) q = q.or('accessibility_wheelchair.eq.true,tags.cs.{wheelchair-accessible}');
  if (filters.strollerFriendly) q = q.or('accessibility_stroller.eq.true,tags.cs.{stroller-friendly}');
  if (filters.sensoryFriendly) q = q.or('sensory_friendly.eq.true,tags.cs.{sensory-friendly}');
  if (filters.transitAccessible) q = q.or('transit_accessible.eq.true,tags.cs.{transit-friendly}');
  if (filters.fencedArea) q = q.or('fenced.eq.true,tags.cs.{fenced}');
  if (filters.selectedCities?.length) q = q.in('city', filters.selectedCities);
  if (filters.curatedActivityIds) q = q.in('id', filters.curatedActivityIds);

  return q;
}

function applyNearby<T extends { location_lat: number | null; location_lon: number | null }>(
  rows: T[],
  userLocation: LocationPoint,
  nearbyKm: number,
): T[] {
  return rows.filter(row =>
    typeof row.location_lat === 'number' &&
    typeof row.location_lon === 'number' &&
    haversineKm(userLocation.lat, userLocation.lon, row.location_lat, row.location_lon) <= nearbyKm,
  );
}

export const activitiesService = {
  async fetchCities(countryCode: string): Promise<string[]> {
    assertSupabaseProvider('activitiesService.fetchCities');
    assertCapability('search_activities');

    const { data, error } = await supabase
      .from('activityspots')
      .select('city')
      .eq('country_code', countryCode)
      .eq('demo_enabled', true)
      .not('city', 'is', null)
      .limit(1000);

    throwIfError('activitiesService.fetchCities', error);

    return [...new Set((data || []).map((row: any) => row.city as string).filter(Boolean))].sort();
  },

  async fetchActivities(filters: ActivityFilters, options: FetchActivitiesOptions = {}): Promise<FetchActivitiesResult> {
    assertSupabaseProvider('activitiesService.fetchActivities');
    assertCapability('search_activities');

    const page = options.page ?? 0;
    const pageSize = options.pageSize ?? ACTIVITY_PAGE_SIZE;
    const nearbyKm = options.nearbyKm ?? null;
    const userLocation = options.userLocation ?? null;
    const isNearby = nearbyKm !== null && userLocation !== null;
    const isCuratedList = Boolean(filters.curatedActivityIds);

    if (filters.curatedActivityIds && filters.curatedActivityIds.length === 0) {
      return {
        activities: [],
        mapActivities: [],
        totalCount: 0,
        hasMore: false,
        center: fallbackCenter(filters.countryCode),
      };
    }

    let gridQuery = applyActivityFilters(
      supabase.from('activityspots').select(GRID_COLUMNS, { count: 'exact' }),
      filters,
    )
      .order('demo_rank', { ascending: true, nullsFirst: false })
      .order('excitement_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (!isNearby && !isCuratedList) {
      gridQuery = gridQuery.range(page * pageSize, (page + 1) * pageSize - 1);
    }

    const mapQuery = applyActivityFilters(
      supabase.from('activityspots').select(MAP_COLUMNS),
      filters,
    )
      .not('location_lat', 'is', null)
      .not('location_lon', 'is', null)
      .order('demo_rank', { ascending: true, nullsFirst: false })
      .order('excitement_score', { ascending: false, nullsFirst: false })
      .limit(isNearby ? 5000 : options.mapLimit ?? 1000);

    const [gridResult, mapResult] = await Promise.all([gridQuery, mapQuery]);
    throwIfError('activitiesService.fetchActivities.grid', gridResult.error);
    throwIfError('activitiesService.fetchActivities.map', mapResult.error);

    let activities = (gridResult.data as ActivitySpot[]) || [];
    let mapActivities = (mapResult.data as SlimActivity[]) || [];
    let totalCount = gridResult.count ?? activities.length;

    if (filters.curatedActivityIds) {
      const order = new Map(filters.curatedActivityIds.map((id, index) => [id, index]));
      activities = activities.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
      mapActivities = mapActivities.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
      totalCount = activities.length;
    }

    if (isNearby) {
      activities = applyNearby(activities, userLocation, nearbyKm);
      mapActivities = applyNearby(mapActivities, userLocation, nearbyKm);
      totalCount = activities.length;
    }

    return {
      activities,
      mapActivities,
      totalCount,
      hasMore: !isNearby && !isCuratedList && totalCount > (page + 1) * pageSize,
      center: mapActivities.length > 0
        ? { lat: mapActivities[0].location_lat!, lon: mapActivities[0].location_lon! }
        : fallbackCenter(filters.countryCode),
    };
  },

  async fetchActivityPage(filters: ActivityFilters, page: number, pageSize = ACTIVITY_PAGE_SIZE): Promise<ActivitySpot[]> {
    assertSupabaseProvider('activitiesService.fetchActivityPage');
    assertCapability('search_activities');

    if (filters.curatedActivityIds && filters.curatedActivityIds.length === 0) return [];

    const { data, error } = await applyActivityFilters(
      supabase.from('activityspots').select(GRID_COLUMNS),
      filters,
    )
      .order('demo_rank', { ascending: true, nullsFirst: false })
      .order('excitement_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    throwIfError('activitiesService.fetchActivityPage', error);
    return (data as ActivitySpot[]) || [];
  },

  async fetchPlannerActivities(): Promise<PlannerActivity[]> {
    assertSupabaseProvider('activitiesService.fetchPlannerActivities');
    assertCapability('view_activities');

    const { data, error } = await supabase
      .from('activityspots')
      .select(PLANNER_COLUMNS)
      .eq('demo_enabled', true)
      .order('demo_rank', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    throwIfError('activitiesService.fetchPlannerActivities', error);
    return (data as PlannerActivity[]) || [];
  },

  async fetchPlanActivities(ids: string[]): Promise<PlanActivity[]> {
    assertSupabaseProvider('activitiesService.fetchPlanActivities');
    assertCapability('plan_trip');

    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('activityspots')
      .select(PLAN_COLUMNS)
      .in('id', ids);

    throwIfError('activitiesService.fetchPlanActivities', error);
    return (data as PlanActivity[]) || [];
  },

  async fetchPlanActivity(id: string): Promise<PlanActivity | null> {
    assertSupabaseProvider('activitiesService.fetchPlanActivity');
    assertCapability('plan_trip');

    const { data, error } = await supabase
      .from('activityspots')
      .select(PLAN_COLUMNS)
      .eq('id', id)
      .single();

    if (error) throwIfError('activitiesService.fetchPlanActivity', error);
    return (data as PlanActivity) || null;
  },

  async fetchCategoriesForActivityIds(ids: string[]): Promise<Record<string, number>> {
    assertSupabaseProvider('activitiesService.fetchCategoriesForActivityIds');
    assertCapability('view_activities');

    if (ids.length === 0) return {};

    const { data, error } = await supabase
      .from('activityspots')
      .select('id, primary_category')
      .in('id', ids);

    throwIfError('activitiesService.fetchCategoriesForActivityIds', error);

    const counts: Record<string, number> = {};
    for (const spot of (data as Array<{ primary_category: string | null }> | null) || []) {
      if (spot.primary_category) counts[spot.primary_category] = (counts[spot.primary_category] ?? 0) + 1;
    }
    return counts;
  },

  async listDemoCuration(filters: DemoActivityAdminFilters = {}): Promise<{ activities: DemoActivityAdminRow[]; totalCount: number }> {
    assertSupabaseProvider('activitiesService.listDemoCuration');
    assertCapability('manage_activity_curation');

    const enabled = filters.enabled ?? 'all';
    const limit = filters.limit ?? 200;
    let query = (supabase as any)
      .from('activityspots')
      .select(ADMIN_DEMO_COLUMNS, { count: 'exact' });

    if (filters.countryCode && filters.countryCode !== 'all') query = query.eq('country_code', filters.countryCode);
    if (enabled === 'enabled') query = query.eq('demo_enabled', true);
    if (enabled === 'disabled') query = query.eq('demo_enabled', false);

    const searchQuery = filters.searchQuery?.trim();
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location_address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query
      .order('demo_enabled', { ascending: false })
      .order('demo_rank', { ascending: true, nullsFirst: false })
      .order('excitement_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    throwIfError('activitiesService.listDemoCuration', error);
    return {
      activities: (data || []) as DemoActivityAdminRow[],
      totalCount: count ?? data?.length ?? 0,
    };
  },

  async updateDemoCuration(id: string, patch: { demo_enabled?: boolean; demo_rank?: number | null }): Promise<void> {
    assertSupabaseProvider('activitiesService.updateDemoCuration');
    assertCapability('manage_activity_curation');

    const updatePatch = {
      ...patch,
      updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from('activityspots')
      .update(updatePatch)
      .eq('id', id);

    throwIfError('activitiesService.updateDemoCuration', error);
  },
};
