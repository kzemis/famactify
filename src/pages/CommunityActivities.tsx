import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatPriceRange, formatDistance, getDistanceOptions, formatDate, formatTime } from '@/lib/formatters';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import MapView from '@/components/MapView';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCountry } from '@/i18n/CountryContext';

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

  // Data
  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySpot[]>([]);
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

  // GPS / Nearby filter
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyKm, setNearbyKm] = useState<number | null>(null);
  const [locatingGPS, setLocatingGPS] = useState(false);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'plan'>('grid');

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
    age_buckets?: string[] | null; urlmoreinfo?: string | null;
    description?: string | null;
  } | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  // Main activities fetch + realtime subscription
  useEffect(() => {
    fetchActivities();

    const channel = supabase
      .channel(`activityspots-changes-${countryCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activityspots',
          filter: `country_code=eq.${countryCode}`,
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivitySpot, ...prev]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [countryCode]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activityspots')
        .select('*')
        .eq('country_code', countryCode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);

      // Set default map center from data
      const withCoords = (data || []).filter(
        a => typeof a.location_lat === 'number' && typeof a.location_lon === 'number',
      );
      if (withCoords.length > 0) {
        setCenter({ lat: withCoords[0].location_lat!, lon: withCoords[0].location_lon! });
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
  };

  // ---------------------------------------------------------------------------
  // Filtering — runs whenever data or any filter state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    filterActivities();
  }, [
    activities, searchQuery, selectedCategories, selectedAges,
    selectedInvolvement, maxPrice, indoorOnly, rainSuitable,
    userLocation, nearbyKm,
    wheelchairAccessible, strollerFriendly, sensoryFriendly, transitAccessible, fencedArea,
    eventsOnly, timingFilter, durationFilter,
  ]);

  const filterActivities = () => {
    let filtered = [...activities];

    const now = new Date().toISOString();

    // Default: filter out past events from normal view
    filtered = filtered.filter(a =>
      // Keep if no event_endtime (regular activity)
      !a.event_endtime ||
      // Keep if event hasn't ended yet
      a.event_endtime > now
    );

    // Events-only filter: only show upcoming events
    if (eventsOnly) {
      filtered = filtered.filter(a =>
        a.event_starttime !== null && a.event_starttime > now
      );
    }

    // Timing filter (PLN-11) — applies to events (event_starttime); regular venues always pass
    if (timingFilter !== 'any') {
      const n = new Date();
      const todayStart = new Date(n); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(n); todayEnd.setHours(23, 59, 59, 999);
      const tomorrowStart = new Date(todayEnd); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd   = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999);
      const daysUntilSat  = n.getDay() === 0 ? 6 : 6 - n.getDay();
      const weekendStart  = new Date(n); weekendStart.setDate(weekendStart.getDate() + daysUntilSat); weekendStart.setHours(0, 0, 0, 0);
      const weekendEnd    = new Date(weekendStart); weekendEnd.setDate(weekendEnd.getDate() + 1); weekendEnd.setHours(23, 59, 59, 999);

      filtered = filtered.filter(a => {
        if (!a.event_starttime) return true; // permanent venues always available
        const start = new Date(a.event_starttime);
        switch (timingFilter) {
          case 'now':      return start >= n && start <= new Date(n.getTime() + 2 * 3600_000);
          case 'today':    return start >= todayStart && start <= todayEnd;
          case 'tomorrow': return start >= tomorrowStart && start <= tomorrowEnd;
          case 'weekend':  return start >= weekendStart && start <= weekendEnd;
          default:         return true;
        }
      });
    }

    // Duration filter (PLN-12) — activities without duration_minutes always pass
    if (durationFilter !== 'any') {
      filtered = filtered.filter(a => {
        if (!a.duration_minutes) return true; // unknown → don't exclude
        switch (durationFilter) {
          case '<60':     return a.duration_minutes < 60;
          case '60-120':  return a.duration_minutes >= 60  && a.duration_minutes <= 120;
          case '120-240': return a.duration_minutes >  120 && a.duration_minutes <= 240;
          case '240+':    return a.duration_minutes > 240;
          default:        return true;
        }
      });
    }

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.location_address?.toLowerCase().includes(q) ||
        a.tags?.some(tag => tag.toLowerCase().includes(q)),
      );
    }

    // Category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(a =>
        a.primary_category && selectedCategories.includes(a.primary_category),
      );
    }

    // Age buckets
    if (selectedAges.length > 0) {
      filtered = filtered.filter(a =>
        a.age_buckets?.some(bucket => selectedAges.includes(bucket)),
      );
    }

    // Involvement
    if (selectedInvolvement) {
      filtered = filtered.filter(a => a.involvement === selectedInvolvement);
    }

    // Budget
    if (maxPrice === 'free') {
      filtered = filtered.filter(a => a.min_price === 0 || a.min_price === null);
    } else if (maxPrice === '10') {
      filtered = filtered.filter(a => a.min_price === null || a.min_price <= 10);
    } else if (maxPrice === '20') {
      filtered = filtered.filter(a => a.min_price === null || a.min_price <= 20);
    }

    // Environment
    if (indoorOnly) {
      filtered = filtered.filter(a =>
        a.location_environment === 'indoor' || a.location_environment === 'both',
      );
    }

    // Rain suitable
    if (rainSuitable) {
      filtered = filtered.filter(a => a.rain_suitable === true);
    }

    // Accessibility filters (DIS-15)
    // Check both v3.2 boolean columns AND tags[] — backward compat with older records
    if (wheelchairAccessible) {
      filtered = filtered.filter(a =>
        a.accessibility_wheelchair === true || a.tags?.includes('wheelchair-accessible'),
      );
    }
    if (strollerFriendly) {
      filtered = filtered.filter(a =>
        a.accessibility_stroller === true || a.tags?.includes('stroller-friendly'),
      );
    }
    if (sensoryFriendly) {
      filtered = filtered.filter(a =>
        a.sensory_friendly === true || a.tags?.includes('sensory-friendly'),
      );
    }
    if (transitAccessible) {
      filtered = filtered.filter(a =>
        a.transit_accessible === true || a.tags?.includes('transit-friendly'),
      );
    }
    if (fencedArea) {
      filtered = filtered.filter(a =>
        a.fenced === true || a.tags?.includes('fenced'),
      );
    }

    // Nearby (GPS distance) — only filters activities that HAVE coordinates
    if (nearbyKm !== null && userLocation) {
      filtered = filtered.filter(a => {
        if (typeof a.location_lat !== 'number' || typeof a.location_lon !== 'number') return false;
        return haversineKm(userLocation.lat, userLocation.lon, a.location_lat, a.location_lon) <= nearbyKm;
      });
    }

    setFilteredActivities(filtered);
  };

  // ---------------------------------------------------------------------------
  // Regional — distance options in correct units for current country
  // ---------------------------------------------------------------------------
  const distanceOptions = useMemo(() => getDistanceOptions(regionConfig), [regionConfig]);

  // ---------------------------------------------------------------------------
  // Derived data — map places come from filtered list (fixes "ignored filters" bug)
  // ---------------------------------------------------------------------------
  const places = useMemo(() => {
    return filteredActivities
      .filter(a => typeof a.location_lat === 'number' && typeof a.location_lon === 'number')
      .map(a => ({
        id: a.id,
        name: a.name,
        lat: a.location_lat!,
        lon: a.location_lon!,
        imageurlthumb: a.imageurlthumb,
        description: a.description,
        location_address: a.location_address,
        min_price: a.min_price,
        max_price: a.max_price,
        age_buckets: a.age_buckets,
        urlmoreinfo: a.urlmoreinfo,
      }));
  }, [filteredActivities]);

  // ---------------------------------------------------------------------------
  // Filter helpers
  // ---------------------------------------------------------------------------
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchQuery) n++;
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
  }, [searchQuery, selectedCategories, selectedAges, selectedInvolvement, maxPrice, indoorOnly, rainSuitable, nearbyKm, wheelchairAccessible, strollerFriendly, sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter]);

  const clearFilters = () => {
    setSearchQuery('');
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

  const addToPlan = (activity: ActivitySpot) => {
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
      <AppHeader />

      <main className={cn('container mx-auto px-4 py-4', planItems.length > 0 && viewMode !== 'plan' && 'pb-20')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t.communityActivities?.title || 'Community Activities'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.communityActivities?.subtitle || 'Browse family-friendly activities, plan your day, contribute a spot'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/contribute')} className="shrink-0 gap-1.5 mt-1">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Contribute</span>
          </Button>
        </div>

        {/* ── Sticky toolbar: view switcher + search + filters ── */}
        <div className="sticky top-16 z-40 -mx-4 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border mb-4">
          <div className="flex items-center gap-2 py-2">
            {/* View switcher */}
            <div className="inline-flex rounded-md border bg-card shrink-0">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="gap-1.5 px-2.5">
                <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Grid</span>
              </Button>
              <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('map')} className="gap-1.5 px-2.5">
                <MapIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline text-xs">Map</span>
              </Button>
              <Button
                variant={viewMode === 'plan' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('plan')}
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
            <div className="max-h-[60vh] overflow-y-auto pb-3">
              <div className="rounded-lg border bg-card p-4 space-y-4">

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

        {/* Results count */}
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredActivities.length} {filteredActivities.length === 1 ? 'activity' : 'activities'}
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
          ) : filteredActivities.length === 0 ? (
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
              {filteredActivities.map((activity) => {
                const images = activity.json?.images || [];
                const hasMultipleImages = images.length > 1;
                const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;

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
                      <div className="h-48 bg-muted flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-muted-foreground" />
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
                        {activity.urlmoreinfo && (
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

        {/* ── Map View ── */}
        {viewMode === 'map' && (
          <div className="mt-2">
            <h2 className="text-2xl font-bold mb-4">
              {t.communityActivities?.mapTitle || 'Activity Locations Map'}
            </h2>
            {/* BUG FIX: height on wrapper → MapView's h-full resolves correctly */}
            <div className="rounded-lg border overflow-hidden h-[360px] md:h-[520px]">
              <MapView
                places={places}
                center={center}
                userLocation={userLocation}
                nearbyKm={nearbyKm}
                onSelect={(id) => setSelectedId(id)}
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
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {places.length} {places.length === 1 ? 'location' : 'locations'} shown
              {activeFilterCount > 0 && ' (filtered)'}
            </p>

            {/* Selected activity card — appears when a map marker is clicked */}
            {selectedId && (() => {
              const sel = filteredActivities.find(a => a.id === selectedId);
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

            {/* Right: route map */}
            <div className="relative w-full lg:w-3/5 h-64 lg:h-full">
              {planPath.length > 0 || showAllOnPlanMap ? (
                <MapView
                  places={showAllOnPlanMap ? places : []}
                  path={planPath}
                  className="h-full rounded-none border-0"
                  center={planPath.length > 0 ? { lat: planPath[0].lat, lon: planPath[0].lon } : center}
                  onSelect={(id) => setPlanMapSelectedId(id)}
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
                    </div>
                  }
                />
              ) : (
                <div className="h-full bg-muted flex flex-col items-center justify-center gap-3">
                  <div className="text-center text-muted-foreground">
                    <p className="text-4xl mb-2">🗺️</p>
                    <p className="text-sm">Add activities with locations to see the route</p>
                  </div>
                  <button
                    onClick={() => setShowAllOnPlanMap(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-border bg-background hover:bg-accent transition-colors"
                  >
                    <Layers className="w-4 h-4" /> Show all activities to pick from
                  </button>
                </div>
              )}

              {/* Plan map activity preview card — appears when a pin is clicked */}
              {planMapSelectedId && (() => {
                const sel = filteredActivities.find(a => a.id === planMapSelectedId);
                if (!sel) return null;
                const inPlan = planItems.some(p => p.activityId === sel.id);
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
                      <div className="w-16 h-16 bg-muted rounded-md shrink-0 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{sel.name}</p>
                      {sel.location_address && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{sel.location_address}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPriceRange(sel.min_price, sel.max_price, t)}
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
              // Other activities to show on map when toggle is on
              const otherPlaces = spotModalShowAll
                ? activities
                    .filter(a => a.id !== spotModalPlace.id && typeof a.location_lat === 'number' && typeof a.location_lon === 'number')
                    .map(a => ({
                      id: a.id, name: a.name,
                      lat: a.location_lat!, lon: a.location_lon!,
                      imageurlthumb: a.imageurlthumb,
                      location_address: a.location_address,
                      min_price: a.min_price, max_price: a.max_price,
                      age_buckets: a.age_buckets, urlmoreinfo: a.urlmoreinfo,
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
