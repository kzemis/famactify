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
  Map as MapIcon, SlidersHorizontal, CloudRain, Home, Locate,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
const DISTANCE_OPTIONS = [
  { value: 2,  label: '2 km' },
  { value: 5,  label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CommunityActivities() {
  const { t } = useLanguage();
  const { countryCode } = useCountry();
  const navigate = useNavigate();

  // Data
  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivitySpot[]>([]);
  const [loading, setLoading] = useState(true);

  // Rich filters (DIS-01)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAges, setSelectedAges] = useState<string[]>([]);
  const [selectedInvolvement, setSelectedInvolvement] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('any');
  const [indoorOnly, setIndoorOnly] = useState(false);
  const [rainSuitable, setRainSuitable] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Focused spot modal (from "Show on map" button)
  const [spotModalOpen, setSpotModalOpen] = useState(false);
  const [spotModalCenter, setSpotModalCenter] = useState<{ lat: number; lon: number } | undefined>(undefined);
  const [spotModalPlace, setSpotModalPlace] = useState<{ id: string; name: string; lat: number; lon: number } | undefined>(undefined);

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
  ]);

  const filterActivities = () => {
    let filtered = [...activities];

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
    return n;
  }, [searchQuery, selectedCategories, selectedAges, selectedInvolvement, maxPrice, indoorOnly, rainSuitable, nearbyKm, wheelchairAccessible, strollerFriendly, sensoryFriendly, transitAccessible, fencedArea]);

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
  // Misc handlers
  // ---------------------------------------------------------------------------
  const getPriceDisplay = (activity: ActivitySpot) => {
    if (!activity.min_price && !activity.max_price) return 'Free';
    if (activity.min_price === 0 && activity.max_price === 0) return 'Free';
    if (activity.min_price && activity.max_price) return `€${activity.min_price} – €${activity.max_price}`;
    if (activity.min_price) return `From €${activity.min_price}`;
    if (activity.max_price) return `Up to €${activity.max_price}`;
    return 'Price varies';
  };

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
      setSpotModalPlace({ id: spot.id, name: spot.name, lat: spot.location_lat, lon: spot.location_lon });
      setSpotModalCenter({ lat: spot.location_lat, lon: spot.location_lon });
      setSpotModalOpen(true);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              {t.communityActivities?.title || 'Community Activities'}
            </h1>
            <p className="text-muted-foreground">
              {t.communityActivities?.subtitle || 'Discover family-friendly activities contributed by our community'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="inline-flex rounded-md border bg-card">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}>
                Grid
              </Button>
              <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('map')}>
                Map
              </Button>
            </div>
            <Button onClick={() => navigate('/contribute')} size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Contribute Activity
            </Button>
          </div>
        </div>

        {/* ── Rich Filters (DIS-01) ── */}
        <div className="mb-6 space-y-3">
          {/* Row 1: search + filters toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search activities…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <button
              onClick={() => setFiltersExpanded(v => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors shrink-0',
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

          {/* Row 2: category quick-pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedCategories([])}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
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
                  'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  selectedCategories.includes(cat)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:border-primary/50',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Advanced filter panel */}
          {filtersExpanded && (
            <div className="rounded-lg border bg-card p-4 space-y-4">

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
                    ? DISTANCE_OPTIONS.map(opt => (
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
                          📍 {haversineKm(userLocation.lat, userLocation.lon, activity.location_lat, activity.location_lon).toFixed(1)} km away
                        </div>
                      )}

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

                      {/* Actions */}
                      <div className="flex gap-2 mt-auto pt-2">
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
                          <Button size="sm" variant="outline" onClick={() => navigate(`/community/${activity.id}/edit`)}>
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
                    {userLocation && DISTANCE_OPTIONS.map(opt => (
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
          </div>
        )}

        {/* ── Focused Spot Modal ── */}
        <Dialog open={spotModalOpen} onOpenChange={setSpotModalOpen}>
          <DialogContent className="sm:max-w-lg">
            {spotModalPlace && (
              <div className="rounded-lg overflow-hidden h-[450px]">
                <MapView
                  places={[spotModalPlace]}
                  center={spotModalCenter}
                />
              </div>
            )}
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

      <Footer />
    </div>
  );
}
