import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Search, MapPin, Euro, Users, Plus, ChevronLeft, ChevronRight, X,
  Map as MapIcon, SlidersHorizontal, CloudRain, Home, Locate, Clock, Timer, Trash2, Layers, LayoutGrid,
  TreePine, GraduationCap, Landmark, PartyPopper, Dumbbell, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPriceRange, formatDistance, getDistanceOptions, formatDate, formatTime } from '@/lib/formatters';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import MapView from '@/components/MapView';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCountry } from '@/i18n/CountryContext';

// ---------------------------------------------------------------------------
// Pagination & column constants (module-level)
// ---------------------------------------------------------------------------
const PAGE_SIZE = 50;

// Grid view: all columns needed for card rendering. `json` is included because the carousel
// uses json.images — but since we paginate (50 rows), this is ~150 KB max vs 6 MB for 2000 rows.
const GRID_COLUMNS = [
  'id', 'name', 'description', 'primary_category', 'activity_type', 'age_buckets',
  'location_address', 'location_lat', 'location_lon', 'imageurlthumb', 'urlmoreinfo', 'urlmoreinfo_status',
  'min_price', 'max_price', 'involvement', 'location_environment', 'rain_suitable',
  'booking_required', 'tags', 'duration_minutes', 'excitement_score', 'country_code',
  'accessibility_wheelchair', 'accessibility_stroller', 'sensory_friendly',
  'transit_accessible', 'fenced', 'event_starttime', 'event_endtime',
  'ticket_url', 'organizer', 'created_at', 'city', 'age_min', 'age_max',
  'facilities_restrooms', 'foodvenue_kidamenities', 'foodvenue_kidcorner',
  'foodvenue_kidmenu', 'source', 'json',
].join(', ');

// Map / slim data: only the columns needed for pins, popups, and addToPlan
const MAP_COLUMNS = [
  'id', 'name', 'location_lat', 'location_lon', 'location_address',
  'imageurlthumb', 'min_price', 'max_price', 'duration_minutes', 'age_buckets', 'urlmoreinfo', 'urlmoreinfo_status',
  'primary_category', 'location_environment', 'activity_type', 'tags',
].join(', ');

// ---------------------------------------------------------------------------
// Haversine distance helper (module-level — no closure needed)
// ---------------------------------------------------------------------------
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Time calculation helpers (session planner)
// ---------------------------------------------------------------------------
function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minutesToHHMM(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
interface ActivitySpot {
  id: string;
  name: string;
  description: string;
  activity_type: string[];
  age_buckets: string[];
  location_address: string | null;
  location_lat: number | null;
  location_lon: number | null;
  imageurlthumb: string | null;
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
  min_price: number | null;
  max_price: number | null;
  accessibility_wheelchair: boolean | null;
  accessibility_stroller: boolean | null;
  facilities_restrooms: boolean | null;
  foodvenue_kidamenities: boolean | null;
  foodvenue_kidcorner: boolean | null;
  foodvenue_kidmenu: boolean | null;
  source: string | null;
  created_at: string;
  // v3.1 schema fields
  primary_category: string | null;
  involvement: string | null;
  city: string | null;
  age_min: number | null;
  age_max: number | null;
  location_environment: string | null;
  rain_suitable: boolean | null;
  booking_required: boolean | null;
  tags: string[] | null;
  highlights: string[] | null;
  excitement_score: number | null;
  country_code: string | null;
  duration_minutes: number | null;
  json: any;
  // v3.2 schema fields
  sensory_friendly: boolean | null;
  transit_accessible: boolean | null;
  fenced: boolean | null;
  // event fields
  event_starttime: string | null;
  event_endtime: string | null;
  ticket_url: string | null;
  organizer: string | null;
}

type ActivityVisualInput = {
  primary_category?: string | null;
  location_environment?: string | null;
  activity_type?: string[] | null;
  tags?: string[] | null;
};

const CATEGORY_VISUALS: Record<string, { label: string; className: string; Icon: LucideIcon }> = {
  Nature: {
    label: 'Outdoor Activity',
    className: 'bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,#d9f99d_0%,#86efac_44%,#38bdf8_100%)] text-emerald-950',
    Icon: TreePine,
  },
  Education: {
    label: 'Learning Activity',
    className: 'bg-[radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.74),transparent_28%),linear-gradient(135deg,#fde68a_0%,#fca5a5_48%,#93c5fd_100%)] text-slate-950',
    Icon: GraduationCap,
  },
  Culture: {
    label: 'Culture Activity',
    className: 'bg-[radial-gradient(circle_at_22%_22%,rgba(255,255,255,0.7),transparent_30%),linear-gradient(135deg,#f9a8d4_0%,#c4b5fd_48%,#67e8f9_100%)] text-slate-950',
    Icon: Landmark,
  },
  Fun: {
    label: 'Fun Activity',
    className: 'bg-[radial-gradient(circle_at_74%_24%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,#fdba74_0%,#f0abfc_48%,#5eead4_100%)] text-slate-950',
    Icon: PartyPopper,
  },
  Social: {
    label: 'Social Activity',
    className: 'bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.7),transparent_30%),linear-gradient(135deg,#bfdbfe_0%,#a7f3d0_50%,#fde68a_100%)] text-slate-950',
    Icon: Users,
  },
  Sport: {
    label: 'Active Activity',
    className: 'bg-[radial-gradient(circle_at_76%_24%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,#fecaca_0%,#fdba74_46%,#86efac_100%)] text-slate-950',
    Icon: Dumbbell,
  },
};

function getActivityVisual(activity: ActivityVisualInput) {
  const category = activity.primary_category && CATEGORY_VISUALS[activity.primary_category]
    ? activity.primary_category
    : activity.location_environment === 'outdoor' || activity.activity_type?.includes('outdoor') || activity.tags?.includes('outdoor')
      ? 'Nature'
      : activity.activity_type?.includes('education') || activity.tags?.includes('science')
        ? 'Education'
        : 'Fun';

  return CATEGORY_VISUALS[category] ?? {
    label: 'Family Activity',
    className: 'bg-[radial-gradient(circle_at_24%_24%,rgba(255,255,255,0.72),transparent_30%),linear-gradient(135deg,#fda4af_0%,#93c5fd_50%,#a7f3d0_100%)] text-slate-950',
    Icon: Sparkles,
  };
}

/** Lightweight type returned by the MAP_COLUMNS query — enough for pins, plan, and addToPlan */
interface SlimActivity {
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

const CATEGORIES = ['Sport', 'Education', 'Culture', 'Nature', 'Social', 'Fun'];
const AGE_BUCKETS = ['0-2', '3-5', '6-8', '9-12', '13+'];
const INVOLVEMENT_OPTIONS = [
  { value: 'active_together', label: '🤝 Active Together' },
  { value: 'supervise',       label: '👀 Watch from Side' },
  { value: 'drop_go',         label: '🚗 Drop & Go' },
];
const PRICE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: '10',   label: 'Under $10' },
  { value: '20',   label: 'Under $20' },
];
// Distance options are now derived from regionConfig — see distanceOptions useMemo below

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CommunityActivities() {
  const { t } = useLanguage();
  const { countryCode, regionConfig } = useCountry();
  const navigate = useNavigate();

  // Data — paginated grid + slim map dataset
  const [activities, setActivities] = useState<ActivitySpot[]>([]);        // current page(s) for grid
  const [allActivitiesForMap, setAllActivitiesForMap] = useState<SlimActivity[]>([]); // all matching, lightweight, for map/plan
  const [totalCount, setTotalCount] = useState(0);   // server-side total matching count
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Rich filters (DIS-01)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    // PLN-07: pre-populate from URL param ?category=Sport
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('category');
    if (catParam && CATEGORIES.includes(catParam)) return [catParam];
    return [];
  });
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedInvolvement, setSelectedInvolvement] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('any');
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [rainSuitable, setRainSuitable] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  // Events filter
  const [eventsOnly, setEventsOnly] = useState(false);

  // Timing filter (PLN-11): Anytime / Now / Later Today / Tomorrow / This Weekend
  const [timingFilter, setTimingFilter] = useState<'any' | 'now' | 'today' | 'tomorrow' | 'weekend'>('any');

  // Duration filter (PLN-12): Any / <1h / 1-2h / 2-4h / Full day
  const [durationFilter, setDurationFilter] = useState<'any' | '<60' | '60-120' | '120-240' | '240+'>('any');

  // Accessibility filters (DIS-15)
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [strollerFriendly, setStrollerFriendly] = useState(false);
  const [sensoryFriendly, setSensoryFriendly] = useState(false);
  const [transitAccessible, setTransitAccessible] = useState(false);
  const [fencedArea, setFencedArea] = useState(false);

  // City / area filter — multi-select
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // GPS / Nearby filter
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyKm, setNearbyKm] = useState<number | null>(null);
  const [locatingGPS, setLocatingGPS] = useState(false);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | undefined>(undefined);

  // Read ?view=plan from URL (set by ParentInbox when approving a kid plan)
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'plan'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'plan' ? 'plan' : 'grid';
  });

  // (Map pins come directly from allActivitiesForMap — no separate viewport fetch)

  // Session plan (shopping-cart pattern)
  interface PlanItem {
    activityId: string;
    name: string;
    startTime: string;   // HH:MM
    endTime: string;     // HH:MM
    durationMinutes: number;
    minPrice: number | null;
    maxPrice: number | null;
    address: string | null;
    lat: number | null;
    lon: number | null;
    imageurlthumb: string | null;
  }

  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState('10:00');
  const [sessionFinishTime, setSessionFinishTime] = useState('18:00');
  const [planName, setPlanName] = useState('My Plan');
  const [loadingKidPlan, setLoadingKidPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [showAllOnPlanMap, setShowAllOnPlanMap] = useState(false);
  const [planMapSelectedId, setPlanMapSelectedId] = useState<string | null>(null);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Focused spot modal (from "Show on map" button)
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [spotModalShowAll, setSpotModalShowAll] = useState(false);
  const [spotModalActivity, setSpotModalActivity] = useState<ActivitySpot | undefined>(undefined);
  const [spotModalCenter, setSpotModalCenter] = useState<{ lat: number; lon: number } | undefined>(undefined);
  const [spotModalPlace, setSpotModalPlace] = useState<{
    id: string; name: string; lat: number; lon: number;
    imageurlthumb?: string | null; location_address?: string | null;
    min_price?: number | null; max_price?: number | null;
    age_buckets?: string[] | null; urlmoreinfo?: string | null; urlmoreinfo_status?: string | null;
    description?: string | null;
  } | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Fetch distinct cities for current country — used for city quick-filter
  // ---------------------------------------------------------------------------
  useEffect(() => {
    supabase
      .from('activityspots')
      .select('city')
      .eq('country_code', countryCode)
      .not('city', 'is', null)
      .limit(1000)
      .then(({ data }) => {
        const cities = [
          ...new Set((data || []).map((r: any) => r.city as string).filter(Boolean)),
        ].sort();
        setAvailableCities(cities);
        setSelectedCities([]); // reset when switching countries
      });
  }, [countryCode]);

  // ---------------------------------------------------------------------------
  // Pending plan from ParentInbox (kid plan approval → pre-fill plan builder)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const raw = localStorage.getItem('famactify-pending-plan');
    if (!raw) return;
    let pending: { source: string; label: string; items: { activityId: string; activityName: string; activityImage: string | null }[] };
    try { pending = JSON.parse(raw); } catch { return; }
    localStorage.removeItem('famactify-pending-plan'); // consume once

    if (!pending.items?.length) return;
    setLoadingKidPlan(true);
    setPlanName(pending.label || "Kid's Plan 🧒");

    // Fetch full activity data for each id so we have price/duration/coords
    const ids = pending.items.map(i => i.activityId);
    supabase
      .from('activityspots')
      .select(MAP_COLUMNS + ', duration_minutes, min_price, max_price, location_address, location_lat, location_lon')
      .in('id', ids)
      .then(({ data }) => {
        const byId = Object.fromEntries((data || []).map((a: any) => [a.id, a]));
        // Preserve kid's ordering
        const newItems: PlanItem[] = pending.items
          .filter(i => byId[i.activityId])
          .map(i => {
            const a = byId[i.activityId];
            return {
              activityId: a.id,
              name: a.name,
              startTime: '00:00',
              endTime: '00:00',
              durationMinutes: a.duration_minutes || 60,
              minPrice: a.min_price,
              maxPrice: a.max_price,
              address: a.location_address,
              lat: a.location_lat,
              lon: a.location_lon,
              imageurlthumb: a.imageurlthumb,
            };
          });
        setPlanItems(prev => {
          const merged = [...prev];
          newItems.forEach(ni => {
            if (!merged.some(p => p.activityId === ni.activityId)) merged.push(ni);
          });
          return recalcPlanTimes(merged, '10:00');
        });
        toast.success(`Kid's plan loaded — adjust, reorder or add more! 🧒`);
      })
      .finally(() => setLoadingKidPlan(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // Scroll-aware AppHeader: hide header on scroll-down, reveal on scroll-up
  // Toolbar stays visible always — it just moves to top-0 when header is hidden
  useEffect(() => {
    const handleScroll = () => {
      if (filtersExpanded) return; // never hide header while filters are open
      const y = window.scrollY;
      const prev = lastScrollYRef.current;
      if (y < 80) setHeaderHidden(false);           // near top — always show header
      else if (y - prev > 6) setHeaderHidden(true);  // scrolling down → hide header
      else if (prev - y > 6) setHeaderHidden(false); // scrolling up → show header
      lastScrollYRef.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [filtersExpanded]);

  // ---------------------------------------------------------------------------
  // Data fetching — server-side filtering + pagination
  // ---------------------------------------------------------------------------

  /**
   * Build a Supabase filter chain from the current UI filter state.
   * Works on any query — call before .select()/.range() so both grid and map
   * queries share identical filter logic.
   */
  const applyServerFilters = useCallback((q: any): any => {
    const now = new Date();
    const nowIso = now.toISOString();

    // Always exclude activities whose event has already ended
    q = q.eq('country_code', countryCode)
         .or(`event_endtime.is.null,event_endtime.gt.${nowIso}`);

    // Events-only: only upcoming events
    if (eventsOnly) {
      q = q.not('event_starttime', 'is', null).gt('event_starttime', nowIso);
    }

    // Timing filter — permanent venues (no event_starttime) always pass via the IS NULL branch
    if (timingFilter !== 'any') {
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      const tmrStart   = new Date(todayEnd); tmrStart.setDate(tmrStart.getDate() + 1); tmrStart.setHours(0, 0, 0, 0);
      const tmrEnd     = new Date(tmrStart); tmrEnd.setHours(23, 59, 59, 999);
      const daysToSat  = now.getDay() === 0 ? 6 : 6 - now.getDay();
      const wkdStart   = new Date(now); wkdStart.setDate(wkdStart.getDate() + daysToSat); wkdStart.setHours(0, 0, 0, 0);
      const wkdEnd     = new Date(wkdStart); wkdEnd.setDate(wkdEnd.getDate() + 1); wkdEnd.setHours(23, 59, 59, 999);
      const twoHours   = new Date(now.getTime() + 2 * 3600_000);

      const ranges: Record<string, string> = {
        now:      `event_starttime.is.null,and(event_starttime.gte.${nowIso},event_starttime.lte.${twoHours.toISOString()})`,
        today:    `event_starttime.is.null,and(event_starttime.gte.${todayStart.toISOString()},event_starttime.lte.${todayEnd.toISOString()})`,
        tomorrow: `event_starttime.is.null,and(event_starttime.gte.${tmrStart.toISOString()},event_starttime.lte.${tmrEnd.toISOString()})`,
        weekend:  `event_starttime.is.null,and(event_starttime.gte.${wkdStart.toISOString()},event_starttime.lte.${wkdEnd.toISOString()})`,
      };
      if (ranges[timingFilter]) q = q.or(ranges[timingFilter]);
    }

    // Duration filter — null duration always passes
    if (durationFilter !== 'any') {
      const dMap: Record<string, string> = {
        '<60':     'duration_minutes.is.null,duration_minutes.lt.60',
        '60-120':  'duration_minutes.is.null,and(duration_minutes.gte.60,duration_minutes.lte.120)',
        '120-240': 'duration_minutes.is.null,and(duration_minutes.gt.120,duration_minutes.lte.240)',
        '240+':    'duration_minutes.is.null,duration_minutes.gt.240',
      };
      if (dMap[durationFilter]) q = q.or(dMap[durationFilter]);
    }

    // Full-text search across name, description, address, tags
    const sq = searchQuery.trim();
    if (sq) {
      q = q.or(`name.ilike.%${sq}%,description.ilike.%${sq}%,location_address.ilike.%${sq}%`);
    }

    // Category
    if (selectedCategories.length > 0) q = q.in('primary_category', selectedCategories);

    // Age buckets — overlaps means at least one bucket matches
    if (selectedAges.length > 0) q = q.overlaps('age_buckets', selectedAges);

    // Involvement
    if (selectedInvolvement) q = q.eq('involvement', selectedInvolvement);

    // Budget — null min_price treated as "unknown / free entry"
    if (maxPrice === 'free') q = q.or('min_price.eq.0,min_price.is.null');
    else if (maxPrice === '10') q = q.or('min_price.lte.10,min_price.is.null');
    else if (maxPrice === '20') q = q.or('min_price.lte.20,min_price.is.null');

    // Environment
    if (indoorOnly) q = q.in('location_environment', ['indoor', 'both']);

    // Boolean flags
    if (rainSuitable)       q = q.eq('rain_suitable', true);
    if (wheelchairAccessible) q = q.or('accessibility_wheelchair.eq.true,tags.cs.{wheelchair-accessible}');
    if (strollerFriendly)   q = q.or('accessibility_stroller.eq.true,tags.cs.{stroller-friendly}');
    if (sensoryFriendly)    q = q.or('sensory_friendly.eq.true,tags.cs.{sensory-friendly}');
    if (transitAccessible)  q = q.or('transit_accessible.eq.true,tags.cs.{transit-friendly}');
    if (fencedArea)         q = q.or('fenced.eq.true,tags.cs.{fenced}');

    // City / area filter
    if (selectedCities.length > 0) q = q.in('city', selectedCities);

    return q;
  }, [
    countryCode, searchQuery, selectedCategories, selectedAges, selectedInvolvement,
    maxPrice, indoorOnly, rainSuitable, wheelchairAccessible, strollerFriendly,
    sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter,
    selectedCities,
  ]);

  /** Ref so loadMore always uses the latest applyServerFilters without stale closure */
  const applyServerFiltersRef = useRef(applyServerFilters);
  applyServerFiltersRef.current = applyServerFilters;

  /**
   * Main fetch effect — fires when filters change (debounced for search),
   * resets to page 0 and runs two parallel queries:
   *   1. Grid (paginated, full columns)
   *   2. Map (all matching, slim columns — for pins + plan "show all")
   *
   * nearbyKm is applied client-side after fetch because PostGIS is not required.
   * When nearbyKm is active, the grid also fetches all (no range) so haversine can filter.
   */
  useEffect(() => {
    const delay = searchQuery.trim() ? 400 : 0;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setCurrentPage(0);
      try {
        const isNearby = nearbyKm !== null && userLocation !== null;

        // ── Grid query — ordered by excitement_score then recency ────────────
        let gridQ = applyServerFiltersRef.current(
          supabase.from('activityspots').select(GRID_COLUMNS, { count: 'exact' })
        )
          .order('excitement_score', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });

        if (!isNearby) {
          gridQ = gridQ.range(0, PAGE_SIZE - 1);
        }
        // (when nearby, skip range so we can haversine-filter the full result)

        // ── Map/slim query — all matching pins (no bbox limit) ──────────────
        const mapQ = applyServerFiltersRef.current(
          supabase.from('activityspots').select(MAP_COLUMNS)
        )
          .not('location_lat', 'is', null)
          .not('location_lon', 'is', null)
          .order('excitement_score', { ascending: false, nullsFirst: false })
          .limit(isNearby ? 5000 : 1000);

        const [gridResult, mapResult] = await Promise.all([gridQ, mapQ]);

        if (gridResult.error) throw gridResult.error;

        let gridData: ActivitySpot[] = (gridResult.data as ActivitySpot[]) || [];
        let mapData: SlimActivity[]  = (mapResult.data  as SlimActivity[])  || [];
        let count = gridResult.count ?? gridData.length;

        // Client-side haversine post-filter (only when nearbyKm set, no PostGIS required)
        if (isNearby) {
          gridData = gridData.filter(a =>
            typeof a.location_lat === 'number' && typeof a.location_lon === 'number' &&
            haversineKm(userLocation!.lat, userLocation!.lon, a.location_lat, a.location_lon) <= nearbyKm!
          );
          mapData = mapData.filter(a =>
            typeof a.location_lat === 'number' && typeof a.location_lon === 'number' &&
            haversineKm(userLocation!.lat, userLocation!.lon, a.location_lat, a.location_lon) <= nearbyKm!
          );
          count = gridData.length;
        }

        setActivities(gridData);
        setTotalCount(count);
        setHasMore(!isNearby && count > PAGE_SIZE);
        setAllActivitiesForMap(mapData);

        // Set default map center from first result with coordinates
        if (mapData.length > 0) {
          setCenter({ lat: mapData[0].location_lat!, lon: mapData[0].location_lon! });
        } else {
          setCenter(countryCode === 'US'
            ? { lat: 37.7749, lon: -122.4194 }
            : { lat: 56.9496, lon: 24.1052 });
        }
      } catch (err: any) {
        console.error('Error fetching activities:', err);
        toast.error('Failed to load activities');
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    countryCode, searchQuery, selectedCategories, selectedAges, selectedInvolvement,
    maxPrice, indoorOnly, rainSuitable, wheelchairAccessible, strollerFriendly,
    sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter,
    nearbyKm, userLocation, selectedCities,
  ]);

  /** Load the next page of grid results (appends to current activities) */
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const { data } = await applyServerFiltersRef.current(
        supabase.from('activityspots').select(GRID_COLUMNS)
      )
        .order('created_at', { ascending: false })
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

      setActivities(prev => [...prev, ...((data as ActivitySpot[]) || [])]);
      setCurrentPage(nextPage);
      setHasMore(totalCount > (nextPage + 1) * PAGE_SIZE);
    } catch (err) {
      console.error('loadMore error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };


  // ---------------------------------------------------------------------------
  // Regional — distance options in correct units for current country
  // ---------------------------------------------------------------------------
  const distanceOptions = useMemo(() => getDistanceOptions(regionConfig), [regionConfig]);

  // ---------------------------------------------------------------------------
  // Derived data — map places come from the slim dataset (all matching, server-filtered)
  // ---------------------------------------------------------------------------

  /** All matching places — used for plan view "show all" overlay */
  const places = useMemo(() => {
    return allActivitiesForMap
      .filter(a => typeof a.location_lat === 'number' && typeof a.location_lon === 'number')
      .map(a => ({
        id: a.id,
        name: a.name,
        lat: a.location_lat!,
        lon: a.location_lon!,
        imageurlthumb: a.imageurlthumb,
        location_address: a.location_address,
        min_price: a.min_price,
        max_price: a.max_price,
        age_buckets: a.age_buckets,
        urlmoreinfo: a.urlmoreinfo,
        urlmoreinfo_status: a.urlmoreinfo_status,
      }));
  }, [allActivitiesForMap]);


  // ---------------------------------------------------------------------------
  // Filter helpers
  // ---------------------------------------------------------------------------
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchQuery) n++;
    if (selectedCities.length > 0) n++;
    if (selectedCategories.length > 0) n++;
    if (selectedAges.length > 0) n++;
    if (selectedInvolvement) n++;
    if (maxPrice !== 'any') n++;
    if (indoorOnly) n++;
    if (rainSuitable) n++;
    if (nearbyKm !== null) n++;
    if (wheelchairAccessible) n++;
    if (strollerFriendly) n++;
    if (sensoryFriendly) n++;
    if (transitAccessible) n++;
    if (fencedArea) n++;
    if (eventsOnly) n++;
    if (timingFilter !== 'any') n++;
    if (durationFilter !== 'any') n++;
    return n;
  }, [searchQuery, selectedCities, selectedCategories, selectedAges, selectedInvolvement, maxPrice, indoorOnly, rainSuitable, nearbyKm, wheelchairAccessible, strollerFriendly, sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCities([]);
    setSelectedCategories([]);
    setSelectedAges([]);
    setSelectedInvolvement('');
    setMaxPrice('any');
    setIndoorOnly(false);
    setRainSuitable(false);
    setNearbyKm(null);
    setUserLocation(null);
    setWheelchairAccessible(false);
    setStrollerFriendly(false);
    setSensoryFriendly(false);
    setTransitAccessible(false);
    setFencedArea(false);
    setEventsOnly(false);
    setTimingFilter('any');
    setDurationFilter('any');
  };

  // ---------------------------------------------------------------------------
  // GPS / locate me
  // ---------------------------------------------------------------------------
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setCenter({ lat: latitude, lon: longitude });
        setLocatingGPS(false);
        toast.success('Location found — pick a distance to filter nearby activities');
      },
      (err) => {
        toast.error(err.message || 'Failed to get location');
        setLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // ---------------------------------------------------------------------------
  // Plan helpers & actions
  // ---------------------------------------------------------------------------
  const recalcPlanTimes = (items: PlanItem[], startHHMM: string): PlanItem[] => {
    let cursor = parseHHMM(startHHMM);
    return items.map(item => {
      const dur = item.durationMinutes || 60;
      const startTime = minutesToHHMM(cursor);
      const endTime = minutesToHHMM(cursor + dur);
      cursor += dur;
      return { ...item, startTime, endTime };
    });
  };

  const addToPlan = (activity: Pick<ActivitySpot, 'id' | 'name' | 'duration_minutes' | 'min_price' | 'max_price' | 'location_address' | 'location_lat' | 'location_lon' | 'imageurlthumb'>) => {
    if (planItems.some(p => p.activityId === activity.id)) return;
    const newItem: PlanItem = {
      activityId: activity.id,
      name: activity.name,
      startTime: '00:00',
      endTime: '00:00',
      durationMinutes: activity.duration_minutes || 60,
      minPrice: activity.min_price,
      maxPrice: activity.max_price,
      address: activity.location_address,
      lat: activity.location_lat,
      lon: activity.location_lon,
      imageurlthumb: activity.imageurlthumb,
    };
    setPlanItems(prev => recalcPlanTimes([...prev, newItem], sessionStartTime));
  };

  const removeFromPlan = (activityId: string) => {
    setPlanItems(prev => recalcPlanTimes(prev.filter(p => p.activityId !== activityId), sessionStartTime));
  };

  const movePlanItem = (index: number, direction: 'up' | 'down') => {
    setPlanItems(prev => {
      const arr = [...prev];
      const swapIdx = direction === 'up' ? index - 1 : index + 1;
      if (swapIdx < 0 || swapIdx >= arr.length) return prev;
      [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
      return recalcPlanTimes(arr, sessionStartTime);
    });
  };

  // Recalc times when session start changes
  useEffect(() => {
    setPlanItems(prev => recalcPlanTimes(prev, sessionStartTime));
  }, [sessionStartTime]);

  const planTotals = useMemo(() => {
    const totalMinutes = planItems.reduce((s, p) => s + p.durationMinutes, 0);
    const totalCost = planItems.reduce((s, p) => s + (p.minPrice || 0), 0);
    const endMinutes = planItems.length > 0 ? parseHHMM(planItems[planItems.length - 1].endTime) : parseHHMM(sessionStartTime);
    const finishMinutes = parseHHMM(sessionFinishTime);
    const overrunsBy = endMinutes - finishMinutes;
    return { totalMinutes, totalCost, overrunsBy };
  }, [planItems, sessionFinishTime, sessionStartTime]);

  const planPath = useMemo(() =>
    planItems
      .filter(p => typeof p.lat === 'number' && typeof p.lon === 'number')
      .map(p => ({ id: p.activityId, lat: p.lat!, lon: p.lon!, name: p.name })),
    [planItems]
  );

  const savePlan = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }
    if (planItems.length === 0) { toast.error('Add at least one activity'); return; }
    setSavingPlan(true);
    try {
      const events = planItems.map(p => ({
        activityId: p.activityId,
        name: p.name,
        startTime: p.startTime,
        endTime: p.endTime,
        durationMinutes: p.durationMinutes,
        minPrice: p.minPrice,
        maxPrice: p.maxPrice,
        address: p.address,
        imageurlthumb: p.imageurlthumb,
      }));
      const { error } = await supabase.from('saved_trips').insert({
        user_id: user.id,
        name: planName,
        events,
        total_cost: planTotals.totalCost,
        total_events: planItems.length,
      });
      if (error) throw error;
      toast.success('Plan saved! View it in Saved Trips.');
      setPlanItems([]);
      setViewMode('grid');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSavingPlan(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Misc handlers
  // ---------------------------------------------------------------------------
  const getPriceDisplay = (activity: ActivitySpot) =>
    formatPriceRange(activity.min_price, activity.max_price, regionConfig);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => setCurrentImageIndex(prev => (prev + 1) % lightboxImages.length);
  const prevImage = () => setCurrentImageIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length);

  const handleShowOnMap = (spot: ActivitySpot) => {
    if (typeof spot.location_lat === 'number' && typeof spot.location_lon === 'number') {
      setSelectedId(spot.id);
      setCenter({ lat: spot.location_lat, lon: spot.location_lon });
      setSpotModalActivity(spot);
      setSpotModalPlace({
        id: spot.id,
        name: spot.name,
        lat: spot.location_lat,
        lon: spot.location_lon,
        imageurlthumb: spot.imageurlthumb,
        location_address: spot.location_address,
        min_price: spot.min_price,
        max_price: spot.max_price,
        age_buckets: spot.age_buckets,
        urlmoreinfo: spot.urlmoreinfo,
        urlmoreinfo_status: spot.urlmoreinfo_status,
        description: spot.description,
      });
      setSpotModalCenter({ lat: spot.location_lat, lon: spot.location_lon });
      setSpotModalShowAll(false);
      setSpotModalOpen(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader hidden={headerHidden} />

      <main className={cn('container mx-auto px-4 py-4', planItems.length > 0 && viewMode !== 'plan' && 'pb-20')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Activities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse family-friendly activities, build a day plan
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/contribute')} className="shrink-0 gap-1.5 mt-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Contribute</span>
          </Button>
        </div>

        {/* ── Sticky toolbar: always visible; moves to top-0 when AppHeader hides ── */}
        <div className={cn(
          'sticky z-40 -mx-4 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border mb-4',
          'transition-[top] duration-300 ease-in-out',
          headerHidden ? 'top-0' : 'top-16',
        )}>
          <div className="flex items-center gap-2 py-2">
            {/* View switcher */}
            <div className="inline-flex rounded-md border bg-card shrink-0">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => { setViewMode('grid'); window.scrollTo({ top: 0 }); }} className="gap-1.5 px-2.5">
                <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Grid</span>
              </Button>
              <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="sm" onClick={() => { setViewMode('map'); window.scrollTo({ top: 0 }); }} className="gap-1.5 px-2.5">
                <MapIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Map</span>
              </Button>
              <Button
                variant={viewMode === 'plan' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setViewMode('plan'); window.scrollTo({ top: 0 }); }}
                className="relative gap-1.5 px-2.5"
              >
                <Clock className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Plan</span>
                {planItems.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {planItems.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('pl-9 h-9', searchQuery && 'pr-8')}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* City quick-filter pill — toggles filter panel */}
            {availableCities.length > 0 && (
              <button
                onClick={() => setFiltersExpanded(v => !v)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-2 rounded-md border text-sm font-medium transition-colors shrink-0',
                  selectedCities.length > 0
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50',
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {selectedCities.length === 0 ? 'City' : selectedCities.length === 1 ? selectedCities[0] : `${selectedCities.length} cities`}
                </span>
                {selectedCities.length > 0 && (
                  <X
                    className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); setSelectedCities([]); }}
                  />
                )}
              </button>
            )}

            {/* Filters button */}
            <button
              onClick={() => setFiltersExpanded(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md border text-sm font-medium transition-colors shrink-0',
                filtersExpanded || activeFilterCount > (searchQuery ? 1 : 0)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50',
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > (searchQuery ? 1 : 0) && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs font-bold">
                  {activeFilterCount - (searchQuery ? 1 : 0)}
                </span>
              )}
            </button>
          </div>


          {/* Filter panel — expands inside sticky bar, scrollable on mobile */}
          {filtersExpanded && (
            <div className="max-h-[72vh] overflow-y-auto pb-3">
              {/* Single sticky row: Filters title + clear all + close */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border flex items-center justify-between py-2 mb-3">
                <span className="text-sm font-semibold text-foreground">
                  Filters{activeFilterCount > 0 ? ` · ${activeFilterCount} active` : ''}
                </span>
                <div className="flex items-center gap-1">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setFiltersExpanded(false)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Close
                  </button>
                </div>
              </div>
              <div className="rounded-lg border bg-card p-4 space-y-4">

              {/* City / Area — multi-select (only when cities are available for this country) */}
              {availableCities.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📍 City / Area</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCities.map(city => (
                      <button
                        key={city}
                        onClick={() =>
                          setSelectedCities(prev =>
                            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
                          )
                        }
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          selectedCities.includes(city)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary/50',
                        )}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategories([])}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      selectedCategories.length === 0
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    All
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() =>
                        setSelectedCategories(prev =>
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
                        )
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        selectedCategories.includes(cat)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Age Group</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedAges([])}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      selectedAges.length === 0
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    All Ages
                  </button>
                  {AGE_BUCKETS.map(age => (
                    <button
                      key={age}
                      onClick={() =>
                        setSelectedAges(prev =>
                          prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age],
                        )
                      }
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        selectedAges.includes(age)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {age} yrs
                    </button>
                  ))}
                </div>
              </div>

              {/* Involvement */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Involvement</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedInvolvement('')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      selectedInvolvement === ''
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    Any
                  </button>
                  {INVOLVEMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedInvolvement(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        selectedInvolvement === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Budget</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMaxPrice('any')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      maxPrice === 'any'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    Any
                  </button>
                  {PRICE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setMaxPrice(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        maxPrice === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Environment */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Environment</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRainSuitable(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      rainSuitable
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    <CloudRain className="w-3.5 h-3.5" /> Rain suitable
                  </button>
                  <button
                    onClick={() => setIndoorOnly(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      indoorOnly
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    <Home className="w-3.5 h-3.5" /> Indoor only
                  </button>
                  <button
                    onClick={() => setEventsOnly(v => !v)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      eventsOnly
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    🎟️ Upcoming Events only
                  </button>
                </div>
              </div>

              {/* Accessibility & Practical (DIS-15) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Accessibility & Practical</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { state: wheelchairAccessible, set: setWheelchairAccessible, label: '♿ Wheelchair' },
                    { state: strollerFriendly,     set: setStrollerFriendly,     label: '🚼 Stroller friendly' },
                    { state: sensoryFriendly,      set: setSensoryFriendly,      label: '🤫 Sensory friendly' },
                    { state: transitAccessible,    set: setTransitAccessible,    label: '🚇 Transit accessible' },
                    { state: fencedArea,           set: setFencedArea,           label: '🔒 Fenced area' },
                  ].map(({ state, set, label }) => (
                    <button
                      key={label}
                      onClick={() => set(v => !v)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        state
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing (PLN-11) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> When
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'any',      label: 'Anytime' },
                    { value: 'now',      label: '⚡ Going Now' },
                    { value: 'today',    label: '☀️ Later Today' },
                    { value: 'tomorrow', label: '📅 Tomorrow' },
                    { value: 'weekend',  label: '🎉 This Weekend' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTimingFilter(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        timingFilter === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration (PLN-12) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" /> How long?
                </p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'any',     label: 'Any length' },
                    { value: '<60',     label: '⚡ Under 1h' },
                    { value: '60-120',  label: '⏱️ 1–2 hours' },
                    { value: '120-240', label: '🕑 2–4 hours' },
                    { value: '240+',    label: '🌅 Full day' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDurationFilter(opt.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        durationFilter === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nearby — GPS + distance */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Nearby</p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* GPS locate button */}
                  <button
                    onClick={handleLocateMe}
                    disabled={locatingGPS}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50',
                      userLocation
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50',
                    )}
                  >
                    <Locate className="w-3.5 h-3.5" />
                    {locatingGPS ? 'Locating…' : userLocation ? 'Location set ✓' : 'Use my location'}
                  </button>
                  {/* Distance pills — only active after GPS obtained */}
                  {userLocation
                    ? distanceOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setNearbyKm(prev => prev === opt.value ? null : opt.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                            nearbyKm === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))
                    : (
                      <span className="text-xs text-muted-foreground">
                        Get location first, then pick a distance
                      </span>
                    )
                  }
                </div>
              </div>

              {/* Clear all */}
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Results count — hidden in map view (map shows its own pin count) */}
        <div className={cn('mb-4 text-sm text-muted-foreground', viewMode === 'map' && 'hidden')}>
          {loading ? '…' : (
            <>
              {activities.length < totalCount
                ? `Showing ${activities.length} of ${totalCount}`
                : totalCount
              }{' '}{totalCount === 1 ? 'activity' : 'activities'}
            </>
          )}
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="ml-2 text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {/* ── Grid View ── */}
        {viewMode === 'grid' && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border bg-card animate-pulse">
                  <div className="h-48 bg-muted rounded-t-xl" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">
                No activities found matching your filters
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity) => {
                const images = activity.json?.images || [];
                const hasMultipleImages = images.length > 1;
                const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;
                const fallbackVisual = getActivityVisual(activity);
                const FallbackIcon = fallbackVisual.Icon;

                return (
                  <div key={activity.id} className="rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    {/* Image / Carousel */}
                    {hasMultipleImages ? (
                      <div className="h-48 relative">
                        <Carousel className="w-full h-full">
                          <CarouselContent>
                            {images.map((imageUrl: string, idx: number) => (
                              <CarouselItem key={idx}>
                                <div
                                  className="h-48 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => openLightbox(images, idx)}
                                >
                                  <img src={imageUrl} alt={`${activity.name} ${idx + 1}`} className="w-full h-full object-cover" />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious className="left-2" />
                          <CarouselNext className="right-2" />
                        </Carousel>
                      </div>
                    ) : displayImage ? (
                      <div
                        className="h-48 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openLightbox([displayImage], 0)}
                      >
                        <img src={displayImage} alt={activity.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={cn('h-48 relative overflow-hidden flex items-center justify-center', fallbackVisual.className)}>
                        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
                        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/55 shadow-sm ring-1 ring-white/70 backdrop-blur-sm">
                          <FallbackIcon className="h-10 w-10" />
                        </div>
                        <span className="absolute bottom-3 left-4 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm backdrop-blur-sm">
                          {fallbackVisual.label}
                        </span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div>
                        <h3 className="font-semibold text-base line-clamp-2 mb-1">{activity.name}</h3>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                        )}
                      </div>

                      {/* Involvement badge (TOG-03) */}
                      {activity.involvement && (
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit',
                          activity.involvement === 'active_together' ? 'bg-green-100 text-green-700' :
                          activity.involvement === 'supervise'       ? 'bg-blue-100  text-blue-700'  :
                                                                       'bg-gray-100  text-gray-600'
                        )}>
                          {activity.involvement === 'active_together' ? '🤝 Together' :
                           activity.involvement === 'supervise'       ? '👀 Watch from Side' :
                                                                        '🚗 Drop & Go'}
                        </span>
                      )}

                      {/* Location */}
                      {activity.location_address && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{activity.location_address}</span>
                        </div>
                      )}

                      {/* Distance badge if nearby filter active */}
                      {userLocation && typeof activity.location_lat === 'number' && typeof activity.location_lon === 'number' && (
                        <div className="text-xs text-muted-foreground">
                          📍 {formatDistance(haversineKm(userLocation.lat, userLocation.lon, activity.location_lat, activity.location_lon), regionConfig)} away
                        </div>
                      )}

                      {/* Event date badge — replaces duration badge for events */}
                      {activity.event_starttime ? (
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                          🎟️ {formatDate(activity.event_starttime, regionConfig)} {formatTime(activity.event_starttime, regionConfig)}
                        </div>
                      ) : null}

                      {/* Price */}
                      <div className="flex items-center gap-2 text-sm">
                        <Euro className="w-4 h-4 text-muted-foreground" />
                        <span>{getPriceDisplay(activity)}</span>
                      </div>

                      {/* Activity types */}
                      <div className="flex flex-wrap gap-1">
                        {activity.activity_type.slice(0, 3).map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                        ))}
                        {activity.activity_type.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{activity.activity_type.length - 3}</Badge>
                        )}
                      </div>

                      {/* Age groups */}
                      {activity.age_buckets.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{activity.age_buckets.join(', ')} years</span>
                        </div>
                      )}

                      {/* Kid amenities */}
                      {(activity.foodvenue_kidamenities || activity.foodvenue_kidcorner || activity.foodvenue_kidmenu) && (
                        <div className="flex flex-wrap gap-1">
                          {activity.foodvenue_kidamenities && <Badge variant="outline" className="text-xs">🎨 Activity Kit</Badge>}
                          {activity.foodvenue_kidcorner && <Badge variant="outline" className="text-xs">🧸 Kids Corner</Badge>}
                          {activity.foodvenue_kidmenu && <Badge variant="outline" className="text-xs">🎪 Playroom</Badge>}
                        </div>
                      )}

                      {/* Accessibility & practical badges */}
                      {(activity.accessibility_wheelchair || activity.tags?.includes('wheelchair-accessible') ||
                        activity.accessibility_stroller || activity.tags?.includes('stroller-friendly') ||
                        activity.sensory_friendly || activity.tags?.includes('sensory-friendly') ||
                        activity.transit_accessible || activity.tags?.includes('transit-friendly') ||
                        activity.fenced || activity.tags?.includes('fenced') ||
                        activity.facilities_restrooms) && (
                        <div className="flex flex-wrap gap-1">
                          {(activity.accessibility_wheelchair || activity.tags?.includes('wheelchair-accessible')) && (
                            <Badge variant="outline" className="text-xs">♿ Wheelchair</Badge>
                          )}
                          {(activity.accessibility_stroller || activity.tags?.includes('stroller-friendly')) && (
                            <Badge variant="outline" className="text-xs">🚼 Stroller</Badge>
                          )}
                          {(activity.sensory_friendly || activity.tags?.includes('sensory-friendly')) && (
                            <Badge variant="outline" className="text-xs">🤫 Sensory friendly</Badge>
                          )}
                          {(activity.transit_accessible || activity.tags?.includes('transit-friendly')) && (
                            <Badge variant="outline" className="text-xs">🚇 Transit</Badge>
                          )}
                          {(activity.fenced || activity.tags?.includes('fenced')) && (
                            <Badge variant="outline" className="text-xs">🔒 Fenced</Badge>
                          )}
                          {activity.facilities_restrooms && (
                            <Badge variant="outline" className="text-xs">🚻 Restrooms</Badge>
                          )}
                        </div>
                      )}

                      {/* Plan button */}
                      <div className="mt-auto pt-3 border-t flex gap-2">
                        {planItems.some(p => p.activityId === activity.id) ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromPlan(activity.id); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-bold">
                              {planItems.findIndex(p => p.activityId === activity.id) + 1}
                            </span>
                            In plan ✓
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); addToPlan(activity); }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border bg-background hover:bg-accent transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add to plan
                          </button>
                        )}
                        {activity.location_lat && activity.location_lon && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserLocation({ lat: activity.location_lat!, lon: activity.location_lon! });
                              setNearbyKm(2);
                              setFiltersExpanded(true);
                              toast.success(`Showing activities near ${activity.name}`);
                            }}
                            title="Show activities near this spot"
                            className="px-2 py-2 rounded-lg border border-border bg-background hover:bg-accent transition-colors text-muted-foreground"
                          >
                            <Locate className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        {activity.urlmoreinfo && activity.urlmoreinfo_status === 'ok' && (
                          <Button variant="link" className="h-auto p-0 text-primary text-sm" asChild>
                            <a href={activity.urlmoreinfo} target="_blank" rel="noopener noreferrer">
                              Website →
                            </a>
                          </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                          {typeof activity.location_lat === 'number' && typeof activity.location_lon === 'number' && (
                            <Button size="sm" variant="outline" onClick={() => handleShowOnMap(activity)}>
                              {t.communityActivities?.showOnMap || 'Show on map'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => navigate(`/activities/${activity.id}/edit`)}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Load more — only shown in grid view when there are more pages */}
        {viewMode === 'grid' && !loading && hasMore && (
          <div className="flex justify-center mt-8 mb-4">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="min-w-[160px]"
            >
              {isLoadingMore ? 'Loading…' : `Load more (${totalCount - activities.length} remaining)`}
            </Button>
          </div>
        )}

        {/* ── Map View ── */}
        {viewMode === 'map' && (
          <div className="mt-2">
            {/* BUG FIX: height on wrapper → MapView's h-full resolves correctly */}
            <div className="relative rounded-lg border overflow-hidden h-[360px] md:h-[520px]">
              <MapView
                places={places}
                center={center}
                userLocation={userLocation}
                nearbyKm={nearbyKm}
                onSelect={(id) => setSelectedId(id)}
                onAddToPlan={(id) => {
                  const a = allActivitiesForMap.find(x => x.id === id);
                  if (a) addToPlan(a);
                }}
                planItemIds={planItems.map(p => p.activityId)}
                overlay={
                  <div className="flex items-center gap-2">
                    {/* GPS locate button — centers map AND sets location for filter */}
                    <Button
                      size="sm"
                      variant={userLocation ? 'default' : 'outline'}
                      onClick={handleLocateMe}
                      disabled={locatingGPS}
                      title={userLocation ? 'Re-center on my location' : 'Find my location'}
                    >
                      <Locate className="w-4 h-4 mr-1" />
                      {locatingGPS ? '…' : 'Me'}
                    </Button>
                    {/* Distance quick-select in map overlay */}
                    {userLocation && distanceOptions.map(opt => (
                      <Button
                        key={opt.value}
                        size="sm"
                        variant={nearbyKm === opt.value ? 'default' : 'outline'}
                        onClick={() => setNearbyKm(prev => prev === opt.value ? null : opt.value)}
                        className="px-2 py-1 h-auto text-xs"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                }
              />
              {/* Loading overlay while main query runs */}
              {loading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-[1000]">
                  <div className="px-4 py-2 bg-white/95 backdrop-blur text-xs text-muted-foreground rounded-full shadow-lg border border-border flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                    Loading…
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {loading ? '…' : (
                <>
                  {places.length} {places.length === 1 ? 'location' : 'locations'} shown
                  {activeFilterCount > 0 && ' (filtered)'}
                </>
              )}
            </p>

            {/* Selected activity card — appears when a map marker is clicked */}
            {selectedId && (() => {
              const sel = allActivitiesForMap.find(a => a.id === selectedId);
              if (!sel) return null;
              const inPlan = planItems.some(p => p.activityId === sel.id);
              return (
                <div className="mt-3 flex items-start gap-3 p-3 rounded-lg border bg-card shadow-sm animate-in slide-in-from-bottom-2">
                  {sel.imageurlthumb && (
                    <img src={sel.imageurlthumb} alt={sel.name} className="w-16 h-16 rounded-md object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{sel.name}</p>
                    {sel.location_address && (
                      <p className="text-xs text-muted-foreground truncate">{sel.location_address}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatPriceRange(sel.min_price, sel.max_price, regionConfig)}
                      {sel.duration_minutes ? ` · ${sel.duration_minutes} min` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => inPlan ? removeFromPlan(sel.id) : addToPlan(sel)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap',
                        inPlan
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border border-border bg-background hover:bg-accent'
                      )}
                    >
                      {inPlan
                        ? `✓ In plan (${planItems.findIndex(p => p.activityId === sel.id) + 1})`
                        : '+ Add to plan'}
                    </button>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="px-3 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Plan View ── */}
        {viewMode === 'plan' && (
          <div className="flex flex-col lg:flex-row gap-0 rounded-xl border overflow-hidden" style={{ height: '70vh' }}>
            {/* Left: plan list */}
            <div className="w-full lg:w-2/5 flex flex-col bg-card border-r overflow-y-auto">
              {/* Plan header */}
              <div className="p-4 border-b space-y-3">
                {loadingKidPlan && (
                  <div className="flex items-center gap-2 text-xs text-primary font-medium animate-pulse">
                    <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin inline-block" />
                    Loading kid's plan…
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    className="flex-1 text-lg font-semibold bg-transparent border-b border-border/50 focus:border-primary outline-none pb-1"
                    placeholder="My Plan"
                  />
                  {planItems.length > 0 && (
                    <button
                      onClick={() => { if (window.confirm('Clear all activities from plan?')) { setPlanItems([]); } }}
                      title="Clear entire plan"
                      className="shrink-0 p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-3 items-center text-sm">
                  <label className="text-muted-foreground">Start</label>
                  <input
                    type="time"
                    value={sessionStartTime}
                    onChange={(e) => setSessionStartTime(e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  />
                  <label className="text-muted-foreground">Finish by</label>
                  <input
                    type="time"
                    value={sessionFinishTime}
                    onChange={(e) => setSessionFinishTime(e.target.value)}
                    className="border rounded px-2 py-1 text-sm bg-background"
                  />
                </div>
                {planTotals.overrunsBy > 0 && (
                  <div className="px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg">
                    ⚠️ Plan overruns by {Math.ceil(planTotals.overrunsBy)} min — consider removing an activity or adjusting finish time
                  </div>
                )}
              </div>

              {/* Plan items */}
              {planItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                  <span className="text-5xl">🗓️</span>
                  <p className="text-muted-foreground">No activities added yet</p>
                  <Button variant="outline" size="sm" onClick={() => setViewMode('grid')}>
                    Browse activities →
                  </Button>
                </div>
              ) : (
                <div className="flex-1 divide-y overflow-y-auto">
                  {planItems.map((item, idx) => (
                    <div key={item.activityId} className="p-4 flex gap-3 hover:bg-accent/30 transition-colors">
                      {/* Number badge */}
                      <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.startTime}–{item.endTime} · {item.durationMinutes} min</p>
                        {item.address && <p className="text-xs text-muted-foreground truncate">{item.address}</p>}
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => movePlanItem(idx, 'up')} disabled={idx === 0} className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Move up">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 15l-6-6-6 6"/></svg>
                        </button>
                        <button onClick={() => movePlanItem(idx, 'down')} disabled={idx === planItems.length - 1} className="p-1 rounded hover:bg-accent disabled:opacity-30 transition-colors" title="Move down">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        <button onClick={() => removeFromPlan(item.activityId)} className="p-1 rounded hover:bg-destructive/10 text-destructive transition-colors" title="Remove">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: totals + save */}
              <div className="p-4 border-t bg-card space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Total: {planTotals.totalMinutes} min · {planItems.length} stops</span>
                  {planTotals.totalCost > 0 && <span>Est. ${planTotals.totalCost}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewMode('grid')} className="flex-1">
                    + Add more
                  </Button>
                  <Button size="sm" onClick={savePlan} disabled={savingPlan || planItems.length === 0} className="flex-1">
                    {savingPlan ? 'Saving…' : '💾 Save plan'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: route map — always visible; shows user/default location when plan is empty */}
            <div className="relative w-full lg:w-3/5 h-64 lg:h-full">
              <MapView
                places={showAllOnPlanMap ? places : []}
                path={planPath}
                className="h-full rounded-none border-0"
                center={
                  planPath.length > 0
                    ? { lat: planPath[0].lat, lon: planPath[0].lon }
                    : (userLocation ?? center)
                }
                userLocation={userLocation}
                onSelect={(id) => setPlanMapSelectedId(id)}
                onAddToPlan={(id) => {
                  const a = allActivitiesForMap.find(x => x.id === id);
                  if (a) addToPlan(a);
                }}
                planItemIds={planItems.map(p => p.activityId)}
                overlay={
                  <div className="flex flex-col gap-1.5 items-end">
                    <button
                      onClick={() => setShowAllOnPlanMap(v => !v)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-md transition-colors',
                        showAllOnPlanMap
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-foreground hover:bg-accent'
                      )}
                      title="Show all activities on map so you can add nearby ones to your plan"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {showAllOnPlanMap ? 'All activities shown' : 'Show all activities'}
                    </button>
                    {showAllOnPlanMap && (
                      <p className="bg-background/90 text-xs text-muted-foreground px-2 py-1 rounded shadow">
                        Click any pin to preview
                      </p>
                    )}
                    {!showAllOnPlanMap && planPath.length === 0 && (
                      <p className="bg-background/90 text-xs text-muted-foreground px-2 py-1 rounded shadow text-right max-w-[160px] leading-snug">
                        Add activities to see route
                      </p>
                    )}
                  </div>
                }
              />

              {/* Plan map activity preview card — appears when a pin is clicked */}
              {planMapSelectedId && (() => {
                const sel = allActivitiesForMap.find(a => a.id === planMapSelectedId);
                if (!sel) return null;
                const inPlan = planItems.some(p => p.activityId === sel.id);
                const fallbackVisual = getActivityVisual(sel);
                const FallbackIcon = fallbackVisual.Icon;
                return (
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-card border-t border-border shadow-xl p-3 flex gap-3 items-start">
                    {/* Thumbnail */}
                    {sel.imageurlthumb ? (
                      <img
                        src={sel.imageurlthumb}
                        alt={sel.name}
                        className="w-16 h-16 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className={cn('w-16 h-16 rounded-md shrink-0 flex items-center justify-center', fallbackVisual.className)}>
                        <FallbackIcon className="w-7 h-7" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{sel.name}</p>
                      {sel.location_address && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{sel.location_address}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPriceRange(sel.min_price, sel.max_price, regionConfig)}
                        {sel.duration_minutes ? ` · ${sel.duration_minutes} min` : ''}
                      </p>
                      {sel.age_buckets && sel.age_buckets.length > 0 && (
                        <p className="text-xs text-muted-foreground">👧 {sel.age_buckets.join(', ')} yrs</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant={inPlan ? 'secondary' : 'default'}
                        className="text-xs h-7 px-2.5 whitespace-nowrap"
                        onClick={() => {
                          if (inPlan) {
                            removeFromPlan(sel.id);
                            toast.success(`Removed "${sel.name}" from plan`);
                          } else {
                            addToPlan(sel);
                            toast.success(`Added "${sel.name}" to plan`);
                          }
                          setPlanMapSelectedId(null);
                        }}
                      >
                        {inPlan ? '✓ In plan' : '+ Add to plan'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2.5"
                        onClick={() => setPlanMapSelectedId(null)}
                      >
                        <X className="w-3 h-3 mr-1" /> Dismiss
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Focused Spot Modal ── */}
        <Dialog open={spotModalOpen} onOpenChange={(open) => { setSpotModalOpen(open); if (!open) setSpotModalShowAll(false); }}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {spotModalPlace && (() => {
              const inPlan = planItems.some(p => p.activityId === spotModalPlace.id);
              // Other activities to show on map when toggle is on — use allActivitiesForMap
              // so ALL matching activities appear (not just the current paginated 50)
              const otherPlaces = spotModalShowAll
                ? allActivitiesForMap
                    .filter(a => a.id !== spotModalPlace.id && typeof a.location_lat === 'number' && typeof a.location_lon === 'number')
                    .map(a => ({
                      id: a.id, name: a.name,
                      lat: a.location_lat!, lon: a.location_lon!,
                      imageurlthumb: a.imageurlthumb,
                      location_address: a.location_address,
                      min_price: a.min_price, max_price: a.max_price,
                      age_buckets: a.age_buckets, urlmoreinfo: a.urlmoreinfo, urlmoreinfo_status: a.urlmoreinfo_status,
                    }))
                : [];
              return (
                <>
                  {/* Activity header */}
                  <div className="px-4 pt-4 pb-3 border-b space-y-2">
                    <div>
                      <p className="font-semibold text-base leading-tight">{spotModalPlace.name}</p>
                      {spotModalPlace.location_address && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />{spotModalPlace.location_address}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPriceRange(spotModalPlace.min_price ?? null, spotModalPlace.max_price ?? null, regionConfig)}
                        {spotModalPlace.age_buckets?.length ? ` · ${spotModalPlace.age_buckets.join(', ')} yrs` : ''}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* Add / Remove from plan */}
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1.5"
                        onClick={() => {
                          if (!inPlan && spotModalActivity) {
                            addToPlan(spotModalActivity);
                          }
                          setSpotModalOpen(false);
                          setSpotModalShowAll(false);
                          setViewMode('plan');
                        }}
                      >
                        {inPlan ? '🗓️ Go to Plan' : '+ Add & Go to Plan'}
                      </Button>

                      {/* Show all activities toggle */}
                      <Button
                        size="sm"
                        variant={spotModalShowAll ? 'secondary' : 'outline'}
                        className="gap-1.5"
                        onClick={() => setSpotModalShowAll(v => !v)}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {spotModalShowAll ? 'Hide others' : 'Show all'}
                      </Button>

                      {/* Back / close */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 ml-auto text-muted-foreground"
                        onClick={() => { setSpotModalOpen(false); setSpotModalShowAll(false); }}
                      >
                        <X className="w-3.5 h-3.5" /> Back
                      </Button>
                    </div>
                  </div>

                  {/* Map — selected spot as path pin #1 (blue circle), others as normal markers */}
                  <div className="h-[360px]">
                    <MapView
                      places={otherPlaces}
                      path={[{ id: spotModalPlace.id, lat: spotModalPlace.lat, lon: spotModalPlace.lon, name: spotModalPlace.name }]}
                      center={spotModalCenter}
                    />
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>

      {/* ── Lightbox ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            <Button
              variant="ghost" size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {lightboxImages.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {currentImageIndex + 1} / {lightboxImages.length}
              </div>
            )}

            {lightboxImages.length > 1 && (
              <Button
                variant="ghost" size="icon"
                className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            <img
              src={lightboxImages[currentImageIndex]}
              alt={`Full size image ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />

            {lightboxImages.length > 1 && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sticky plan bar ── */}
      {planItems.length > 0 && viewMode !== 'plan' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg border-t">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-screen-xl">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold">🗓️ {planItems.length} {planItems.length === 1 ? 'activity' : 'activities'}</span>
              <span>⏱️ {Math.floor(planTotals.totalMinutes / 60)}h {planTotals.totalMinutes % 60}m</span>
              {planTotals.totalCost > 0 && <span>💰 Est. ${planTotals.totalCost}</span>}
              {planTotals.overrunsBy > 0 && (
                <span className="px-2 py-0.5 bg-destructive text-destructive-foreground rounded-full text-xs font-bold">
                  Overruns by {Math.round(planTotals.overrunsBy / 60 * 10) / 10}h
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlanItems([])}
                title="Clear plan"
                className="p-1.5 rounded-md hover:bg-primary-foreground/20 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setViewMode('plan')}
                className="font-semibold"
              >
                View Plan →
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
