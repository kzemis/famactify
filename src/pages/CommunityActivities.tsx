import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import {
  Search, MapPin, Euro, Users, Plus, ChevronLeft, ChevronRight, X,
  Map as MapIcon, SlidersHorizontal, CloudRain, Home, Locate, Clock, Timer, Trash2, Layers, LayoutGrid,
  TreePine, GraduationCap, Landmark, PartyPopper, Dumbbell, Sparkles, Check, CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { cleanDisplayText } from '@/lib/text';
import { formatPriceRange, formatDistance, getDistanceOptions, formatDate, formatTime } from '@/lib/formatters';
import { readKidProposals, uniqueActionableKidProposals, writeKidProposals, type KidProposal } from '@/lib/kidProposals';
import MapView from '@/components/LazyMapView';
import { ShareSheet, type ShareSheetTripData } from '@/components/ShareSheet';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCountry } from '@/i18n/CountryContext';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { activitiesService, authService, tripsService, curatedListsService, profileService, ACTIVITY_PAGE_SIZE as PAGE_SIZE, type ActivityFilters, type ActivitySpot, type CuratedList, type SlimActivity } from '@/services';
import MoodSuggest, { type MoodFilters } from '@/components/MoodSuggest';
import RegionPill from '@/components/RegionPill';
import type { User } from '@supabase/supabase-js';

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

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
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

// Kid mode — emoji per category
const KID_CATEGORY_EMOJIS: Record<string, string> = {
  Nature:    '🌿',
  Education: '🔬',
  Culture:   '🎨',
  Fun:       '🎉',
  Social:    '🤝',
  Sport:     '🏃',
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

interface ScalableMultiPickerProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  emoji?: string;
}

function ScalableMultiPicker({
  label,
  options,
  selected,
  onChange,
  emptyLabel,
  searchPlaceholder,
  emoji,
}: ScalableMultiPickerProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const isLargeSet = options.length > 10;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter(option => option.toLowerCase().includes(normalizedQuery))
    : options;
  const visibleOptions = !isLargeSet || expanded || normalizedQuery
    ? filteredOptions
    : filteredOptions.slice(0, 8);

  const toggle = (value: string) => {
    onChange(selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value]);
  };

  return (
    <div className="rounded-xl border bg-background/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {emoji ? `${emoji} ` : ''}{label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selected.length === 0 ? emptyLabel : `${selected.length} selected`}
          </p>
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="min-h-[36px] px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {selected.map(value => (
            <button
              key={value}
              onClick={() => toggle(value)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 text-sm"
            >
              {value}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {isLargeSet && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>
      )}

      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2', isLargeSet && 'max-h-64 overflow-y-auto pr-1')}>
        {visibleOptions.map(option => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => toggle(option)}
              className={cn(
                'min-h-[44px] w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50',
              )}
            >
              <span className="line-clamp-1">{option}</span>
              {isSelected && <Check className="w-4 h-4 shrink-0" />}
            </button>
          );
        })}
      </div>

      {isLargeSet && !normalizedQuery && filteredOptions.length > 8 && (
        <button
          onClick={() => setExpanded(value => !value)}
          className="min-h-[40px] w-full rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {expanded ? 'Show fewer' : `Show all ${filteredOptions.length}`}
        </button>
      )}

      {isLargeSet && normalizedQuery && filteredOptions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No matches</p>
      )}
    </div>
  );
}

interface ScalableSinglePickerOption {
  value: string;
  label: string;
  description?: string | null;
}

interface ScalableSinglePickerProps {
  label: string;
  options: ScalableSinglePickerOption[];
  selected: string;
  onChange: (value: string) => void;
  allLabel: string;
  searchPlaceholder: string;
  emoji?: string;
}

function ScalableSinglePicker({
  label,
  options,
  selected,
  onChange,
  allLabel,
  searchPlaceholder,
  emoji,
}: ScalableSinglePickerProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const isLargeSet = options.length > 8;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery),
      )
    : options;
  const visibleOptions = !isLargeSet || expanded || normalizedQuery
    ? filteredOptions
    : filteredOptions.slice(0, 6);
  const selectedOption = options.find(option => option.value === selected);

  return (
    <div className="rounded-xl border bg-background/60 p-3 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {emoji ? `${emoji} ` : ''}{label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedOption ? selectedOption.label : allLabel}
        </p>
      </div>

      {isLargeSet && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 pl-9"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        <button
          onClick={() => onChange('')}
          className={cn(
            'min-h-[44px] w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
            !selected
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border hover:border-primary/50',
          )}
        >
          <span>{allLabel}</span>
          {!selected && <Check className="w-4 h-4 shrink-0" />}
        </button>

        <div className={cn('grid grid-cols-1 gap-2', isLargeSet && 'max-h-64 overflow-y-auto pr-1')}>
          {visibleOptions.map(option => {
            const isSelected = selected === option.value;
            return (
              <button
                key={option.value}
                onClick={() => onChange(option.value)}
                className={cn(
                  'min-h-[44px] w-full flex items-start justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50',
                )}
              >
                <span className="min-w-0">
                  <span className="block font-medium line-clamp-1">{option.label}</span>
                  {option.description && <span className="block text-xs opacity-75 line-clamp-1">{option.description}</span>}
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {isLargeSet && !normalizedQuery && filteredOptions.length > 6 && (
        <button
          onClick={() => setExpanded(value => !value)}
          className="min-h-[40px] w-full rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {expanded ? 'Show fewer' : `Show all ${filteredOptions.length}`}
        </button>
      )}

      {isLargeSet && normalizedQuery && filteredOptions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No matches</p>
      )}
    </div>
  );
}

interface KidProposalItem {
  id: string;
  activityId: string;
  activityName: string;
  activityImage: string | null;
  status: 'pending' | 'parent_suggestion';
  lat: number | null;
  lon: number | null;
  address: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  ageBuckets: string[] | null;
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
}

interface FamilyPlaylistItem {
  activityId: string;
  activityName: string;
  activityImage: string | null;
  lat: number | null;
  lon: number | null;
  address: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  ageBuckets: string[] | null;
  urlmoreinfo: string | null;
  urlmoreinfo_status: string | null;
}

interface FamilyPlaylist {
  id: string;
  title: string;
  assignedProfileId: string;
  assignedProfileName: string;
  createdAt: string;
  createdByProfileId: string | null;
  items: FamilyPlaylistItem[];
}

const FAMILY_PLAYLISTS_KEY = 'famactify-family-playlists';

function loadFamilyPlaylists(): FamilyPlaylist[] {
  try {
    return JSON.parse(localStorage.getItem(FAMILY_PLAYLISTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFamilyPlaylists(playlists: FamilyPlaylist[]) {
  localStorage.setItem(FAMILY_PLAYLISTS_KEY, JSON.stringify(playlists));
  window.dispatchEvent(new Event('storage'));
}

function toKidProposalItem(proposal: KidProposal): KidProposalItem {
  return {
    id: proposal.id,
    activityId: proposal.activityId,
    activityName: proposal.activityName,
    activityImage: proposal.activityImage ?? null,
    status: proposal.status as 'pending' | 'parent_suggestion',
    lat: proposal.lat ?? null,
    lon: proposal.lon ?? null,
    address: proposal.address ?? null,
    minPrice: proposal.minPrice ?? null,
    maxPrice: proposal.maxPrice ?? null,
    ageBuckets: proposal.ageBuckets ?? null,
    urlmoreinfo: proposal.urlmoreinfo ?? null,
    urlmoreinfo_status: proposal.urlmoreinfo_status ?? null,
  };
}

function loadPlanRelevantKidProposals(): KidProposalItem[] {
  const proposals = readKidProposals();
  return [
    ...uniqueActionableKidProposals(proposals, 'pending'),
    ...uniqueActionableKidProposals(proposals, 'parent_suggestion'),
  ].map(toKidProposalItem);
}

function getNavigationUrls(place: { name?: string; location_lat?: number | null; location_lon?: number | null; location_address?: string | null }) {
  const hasCoords = typeof place.location_lat === 'number' && typeof place.location_lon === 'number';
  const query = hasCoords
    ? `${place.location_lat},${place.location_lon}`
    : (place.location_address || place.name || '');
  const encoded = encodeURIComponent(query);
  return {
    google: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    waze: hasCoords
      ? `https://waze.com/ul?ll=${place.location_lat},${place.location_lon}&navigate=yes`
      : `https://waze.com/ul?q=${encoded}&navigate=yes`,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CommunityActivities() {
  const { t } = useLanguage();
  const { country, countryCode, regionConfig } = useCountry();
  const navigate = useNavigate();
  const { search } = useLocation();
  const { isKid, isLittleExplorer, mode, currentProfile, profiles } = useFamilyMode();

  // Current authenticated user (for edit permission check)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  useEffect(() => {
    authService.getCurrentUser().then(user => {
      setCurrentUser(user);
      if (!user) return;
      // Load family profile ages silently for mood mode pre-seeding
      profileService.getCurrentProfile().then(({ profile }) => {
        const kids = ((profile as any)?.children as any[]) || [];
        const buckets = kids.map((c: any) => {
          const age = Number(c.age);
          if (age <= 2) return '0-2';
          if (age <= 5) return '3-5';
          if (age <= 8) return '6-8';
          if (age <= 12) return '9-12';
          return '13+';
        });
        setFamilyAges([...new Set(buckets)]);
      }).catch(() => {});
    }).catch(() => setCurrentUser(null));
  }, []);

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

  // Curated list lens — list selection filters the main activity view
  const [curatedLists, setCuratedLists] = useState<CuratedList[]>([]);
  const [selectedCuratedListSlug, setSelectedCuratedListSlug] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('list') || '';
  });
  const [selectedCuratedList, setSelectedCuratedList] = useState<CuratedList | null>(null);
  const [curatedActivityIds, setCuratedActivityIds] = useState<string[] | undefined>(undefined);

  // Family playlists — parent-created, child-assigned, local-first private lists
  const [familyPlaylists, setFamilyPlaylists] = useState<FamilyPlaylist[]>(() => loadFamilyPlaylists());
  const [selectedFamilyPlaylistId, setSelectedFamilyPlaylistId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('familyList') || '';
  });
  const [familyPlaylistOpen, setFamilyPlaylistOpen] = useState(false);
  const [familyPlaylistTitle, setFamilyPlaylistTitle] = useState('');
  const [familyPlaylistAssigneeId, setFamilyPlaylistAssigneeId] = useState('');

  // GPS / Nearby filter
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [nearbyKm, setNearbyKm] = useState<number | null>(null);
  const [locatingGPS, setLocatingGPS] = useState(false);

  // UI
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lon: number } | undefined>(undefined);

  // Read ?view=plan / ?kidplan= from URL
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'plan' | 'mood'>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'plan' || params.get('kidplan')) return 'plan';
    return 'grid';
  });

  // Sync viewMode with URL — makes Plan tab and Discover tab work via React Router navigation
  useEffect(() => {
    const params = new URLSearchParams(search);
    const wantPlan = params.get('view') === 'plan' || !!params.get('kidplan');
    setViewMode(prev => {
      if (wantPlan && prev !== 'plan') return 'plan';
      if (!wantPlan && prev === 'plan') return 'grid';
      return prev; // map / mood stay as-is — entered via in-page buttons only
    });
  }, [search]);

  // Family ages derived from profile — pre-seeded into mood mode
  const [familyAges, setFamilyAges] = useState<string[]>([]);

  // Share dialog (kid plan link)

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
  const [planShareData, setPlanShareData] = useState<ShareSheetTripData | null>(null);
  const [showAllOnPlanMap, setShowAllOnPlanMap] = useState(false);
  const [planMapSelectedId, setPlanMapSelectedId] = useState<string | null>(null);

  // Kid mode — wishlisted activity IDs (synced from localStorage proposals)
  const [wishlisted, setWishlisted] = useState<Set<string>>(() => {
    const proposals = readKidProposals();
    return new Set(proposals.filter(p => p.status === 'pending').map((p: any) => p.activityId as string));
  });

  // Parent plan view — pending kid proposals shown as wishlist section
  const [kidsProposals, setKidsProposals] = useState<KidProposalItem[]>(() => loadPlanRelevantKidProposals());

  // Keep kidsProposals in sync with storage events (from kid mode)
  useEffect(() => {
    const sync = () => {
      const all = readKidProposals();
      setKidsProposals(loadPlanRelevantKidProposals());
      setWishlisted(new Set(all.filter(p => p.status === 'pending').map(p => p.activityId as string)));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  // AppHeader badge click — switch to plan view even if already on this page
  useEffect(() => {
    const handler = () => {
      setViewMode('plan');
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('famactify:show-kid-wish', handler);
    return () => window.removeEventListener('famactify:show-kid-wish', handler);
  }, []);

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
    activitiesService.fetchCities(countryCode)
      .then(setAvailableCities)
      .catch(() => setAvailableCities([]))
      .finally(() => setSelectedCities([])); // reset when switching countries
  }, [countryCode]);


  // ---------------------------------------------------------------------------
  // Curated list lens — public lists filter this same /activities surface
  // ---------------------------------------------------------------------------
  useEffect(() => {
    curatedListsService.listPublished()
      .then(setCuratedLists)
      .catch(() => setCuratedLists([]));
  }, []);

  useEffect(() => {
    if (!selectedCuratedListSlug) {
      setSelectedCuratedList(null);
      setCuratedActivityIds(undefined);
      return;
    }

    let cancelled = false;
    curatedListsService.getBySlug(selectedCuratedListSlug)
      .then(result => {
        if (cancelled) return;
        if (!result) {
          setSelectedCuratedList(null);
          setCuratedActivityIds([]);
          toast.error('Curated list not found');
          return;
        }
        setSelectedCuratedList(result.list);
        setCuratedActivityIds(result.items.map(item => item.activity.id));
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedCuratedList(null);
          setCuratedActivityIds([]);
          toast.error('Failed to load curated list');
        }
      });

    return () => { cancelled = true; };
  }, [selectedCuratedListSlug]);

  const selectCuratedList = (slug: string) => {
    setSelectedCuratedListSlug(slug);
    const params = new URLSearchParams(window.location.search);
    if (slug) params.set('list', slug);
    else params.delete('list');
    params.delete('kidplan');
    const query = params.toString();
    navigate(query ? `/activities?${query}` : '/activities', { replace: true });
  };

  const childProfiles = useMemo(() => profiles.filter(profile => profile.mode !== 'parent'), [profiles]);

  const assignedFamilyPlaylists = useMemo(() => {
    if (!currentProfile) return [];
    return familyPlaylists.filter(playlist => playlist.assignedProfileId === currentProfile.id);
  }, [familyPlaylists, currentProfile]);

  const selectedFamilyPlaylist = useMemo(() => {
    if (!selectedFamilyPlaylistId) return null;
    return familyPlaylists.find(playlist => playlist.id === selectedFamilyPlaylistId) ?? null;
  }, [familyPlaylists, selectedFamilyPlaylistId]);

  useEffect(() => {
    const sync = () => setFamilyPlaylists(loadFamilyPlaylists());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!selectedFamilyPlaylistId || !currentProfile || !isLittleExplorer) return;
    const stillAssigned = familyPlaylists.some(
      playlist => playlist.id === selectedFamilyPlaylistId && playlist.assignedProfileId === currentProfile.id,
    );
    if (!stillAssigned) {
      setSelectedFamilyPlaylistId('');
      const params = new URLSearchParams(window.location.search);
      params.delete('familyList');
      const query = params.toString();
      navigate(query ? `/activities?${query}` : '/activities', { replace: true });
    }
  }, [selectedFamilyPlaylistId, familyPlaylists, currentProfile, isLittleExplorer, navigate]);

  const selectFamilyPlaylist = (playlistId: string) => {
    setSelectedFamilyPlaylistId(playlistId);
    const params = new URLSearchParams(window.location.search);
    if (playlistId) {
      params.set('familyList', playlistId);
      params.delete('list');
      setSelectedCuratedListSlug('');
      setSelectedCuratedList(null);
      setCuratedActivityIds(undefined);
    } else {
      params.delete('familyList');
    }
    const query = params.toString();
    navigate(query ? `/activities?${query}` : '/activities', { replace: true });
  };

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
    activitiesService.fetchPlanActivities(ids)
      .then((data) => {
        const byId = Object.fromEntries(data.map((activity) => [activity.id, activity]));
        // Preserve kid's ordering
        const newItems: PlanItem[] = pending.items
          .filter(i => byId[i.activityId])
          .map(i => {
            const activity = byId[i.activityId];
            return {
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

  // Load shared kid plan from ?kidplan= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('kidplan');
    if (!encoded) return;
    // Strip param from URL without triggering navigation
    window.history.replaceState({}, '', '/activities?view=plan');
    try {
      const json = decodeURIComponent(escape(atob(encoded)));
      const payload = JSON.parse(json);
      if (!payload.i?.length) return;
      const kidName: string = payload.k || 'Kid';
      setPlanName(`${kidName}'s Plan 💌`);
      const newItems: PlanItem[] = (payload.i as any[]).map(item => ({
        activityId: item.id,
        name: item.nm,
        startTime: '00:00',
        endTime: '00:00',
        durationMinutes: item.dur || 60,
        minPrice: null,
        maxPrice: null,
        address: item.addr ?? null,
        lat: typeof item.lat === 'number' ? item.lat : null,
        lon: typeof item.lon === 'number' ? item.lon : null,
        imageurlthumb: item.img ?? null,
      }));
      setPlanItems(recalcPlanTimes(newItems, '10:00'));
      setViewMode('plan');
      toast.success(`${kidName}'s plan loaded! Review and adjust ✨`);
    } catch {
      toast.error('Could not load shared plan — link may be invalid');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
   * Main fetch effect — fires when filters change (debounced for search),
   * resets to page 0 and runs two parallel queries:
   *   1. Grid (paginated, full columns)
   *   2. Map (all matching, slim columns — for pins + plan "show all")
   *
   * nearbyKm is applied client-side after fetch because PostGIS is not required.
   * When nearbyKm is active, the grid also fetches all (no range) so haversine can filter.
   */
  const activeActivityIds = useMemo(
    () => selectedFamilyPlaylist
      ? selectedFamilyPlaylist.items.map(item => item.activityId)
      : curatedActivityIds,
    [selectedFamilyPlaylist, curatedActivityIds],
  );

  const activityFilters = useMemo<ActivityFilters>(() => ({
    countryCode,
    searchQuery,
    selectedCategories,
    selectedAges,
    selectedInvolvement,
    maxPrice,
    indoorOnly,
    rainSuitable,
    wheelchairAccessible,
    strollerFriendly,
    sensoryFriendly,
    transitAccessible,
    fencedArea,
    eventsOnly,
    timingFilter,
    durationFilter,
    selectedCities,
    curatedActivityIds: activeActivityIds,
  }), [
    countryCode, searchQuery, selectedCategories, selectedAges, selectedInvolvement,
    maxPrice, indoorOnly, rainSuitable, wheelchairAccessible, strollerFriendly,
    sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter,
    selectedCities, activeActivityIds,
  ]);

  useEffect(() => {
    const delay = searchQuery.trim() ? 400 : 0;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setCurrentPage(0);
      try {
        const result = await activitiesService.fetchActivities(activityFilters, {
          page: 0,
          pageSize: PAGE_SIZE,
          nearbyKm,
          userLocation,
        });

        setActivities(result.activities);
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setAllActivitiesForMap(result.mapActivities);
        setCenter(result.center);
      } catch (err: any) {
        console.error('Error fetching activities:', err);
        toast.error('Failed to load activities');
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [activityFilters, nearbyKm, searchQuery, userLocation]);

  /** Load the next page of grid results (appends to current activities) */
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    try {
      const data = await activitiesService.fetchActivityPage(activityFilters, nextPage, PAGE_SIZE);
      setActivities(prev => [...prev, ...data]);
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
    if (selectedCuratedListSlug) n++;
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
  }, [searchQuery, selectedCities, selectedCuratedListSlug, selectedCategories, selectedAges, selectedInvolvement, maxPrice, indoorOnly, rainSuitable, nearbyKm, wheelchairAccessible, strollerFriendly, sensoryFriendly, transitAccessible, fencedArea, eventsOnly, timingFilter, durationFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCities([]);
    selectCuratedList('');
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
  // Mood suggest helpers
  // ---------------------------------------------------------------------------
  const enterMoodMode = () => {
    clearFilters();
    if (familyAges.length > 0) setSelectedAges(familyAges);
    setViewMode('mood');
  };

  const applyMoodFilters = (filters: MoodFilters) => {
    if (filters.categories !== undefined) setSelectedCategories(filters.categories);
    if (filters.ages !== undefined) setSelectedAges(filters.ages);
    if (filters.indoor !== undefined) setIndoorOnly(filters.indoor);
    if (filters.rainSuitable !== undefined) setRainSuitable(filters.rainSuitable);
    if (filters.duration !== undefined) setDurationFilter(filters.duration);
    if (filters.maxPrice !== undefined) setMaxPrice(filters.maxPrice);
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
        // No toast — GPS button label changes to "Located ✓" and distance chips appear,
        // both serve as feedback without blocking the controls
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

  const openFamilyPlaylistCreator = () => {
    if (planItems.length === 0) {
      toast.error('Add activities first');
      return;
    }
    if (childProfiles.length === 0) {
      toast.error('Add a kid or Little Explorer profile first');
      navigate('/kids');
      return;
    }
    setFamilyPlaylistTitle(planName && planName !== 'My Plan' ? planName : 'Picked for you');
    setFamilyPlaylistAssigneeId(childProfiles[0].id);
    setFamilyPlaylistOpen(true);
  };

  const createFamilyPlaylist = () => {
    if (planItems.length === 0) {
      toast.error('Add activities first');
      return;
    }
    const assignee = childProfiles.find(profile => profile.id === familyPlaylistAssigneeId);
    if (!assignee) {
      toast.error('Choose a kid profile');
      return;
    }
    const playlist: FamilyPlaylist = {
      id: crypto.randomUUID(),
      title: familyPlaylistTitle.trim() || 'Picked for you',
      assignedProfileId: assignee.id,
      assignedProfileName: assignee.name,
      createdAt: new Date().toISOString(),
      createdByProfileId: currentProfile?.id ?? null,
      items: planItems.map(item => ({
        activityId: item.activityId,
        activityName: item.name,
        activityImage: item.imageurlthumb,
        lat: item.lat,
        lon: item.lon,
        address: item.address,
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        ageBuckets: null,
        urlmoreinfo: null,
        urlmoreinfo_status: null,
      })),
    };
    const next = [playlist, ...familyPlaylists.filter(existing => existing.id !== playlist.id)];
    saveFamilyPlaylists(next);
    setFamilyPlaylists(next);
    setFamilyPlaylistOpen(false);
    toast.success(`Playlist sent to ${assignee.name} 🎁`);
  };

  /** Dismiss a wishlist item without adding it (marks declined) */
  const dismissProposal = (proposalId: string) => {
    const all = readKidProposals();
    const updated = all.map(p => p.id === proposalId ? { ...p, status: 'declined' } : p);
    writeKidProposals(updated);
  };

  /** Add a kid's wishlist proposal to the plan, mark it approved */
  const addProposalToPlan = async (proposal: KidProposalItem) => {
    // Try the already-loaded slim dataset first
    const slim = allActivitiesForMap.find(a => a.id === proposal.activityId);
    if (slim) {
      addToPlan(slim);
    } else {
      const activity = await activitiesService.fetchPlanActivity(proposal.activityId);
      if (activity) addToPlan(activity);
    }
    // Mark proposal approved so it leaves the wishlist
    const all = readKidProposals();
    const updated = all.map(p => p.id === proposal.id ? { ...p, status: 'approved' } : p);
    writeKidProposals(updated);
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

  const planActivityIds = useMemo(
    () => new Set(planItems.map(item => item.activityId)),
    [planItems],
  );

  const pendingWishlistProposals = useMemo(
    () => kidsProposals.filter(proposal =>
      proposal.status === 'pending' && !planActivityIds.has(proposal.activityId)
    ),
    [kidsProposals, planActivityIds],
  );

  const parentSuggestionProposals = useMemo(
    () => mode === 'parent'
      ? []
      : kidsProposals.filter(proposal =>
          proposal.status === 'parent_suggestion' && !planActivityIds.has(proposal.activityId)
        ),
    [kidsProposals, mode, planActivityIds],
  );

  const visiblePlanProposals = useMemo(
    () => [...pendingWishlistProposals, ...parentSuggestionProposals],
    [pendingWishlistProposals, parentSuggestionProposals],
  );

  /** True if the current user may edit this activity */
  const canEdit = (activity: ActivitySpot): boolean => {
    if (!currentUser) return false;
    // Supabase admin role or app_metadata.role = 'admin'
    if (currentUser.app_metadata?.role === 'admin') return true;
    // Contributor — only if they submitted it (created_by not null = user-contributed)
    return activity.created_by != null && activity.created_by === currentUser.id;
  };

  /**
   * Wishlist items that have map coordinates — shown as orange heart pins in the plan view map.
   * We resolve coordinates from the already-loaded slim dataset.
   */
  const wishlistMapPlaces = useMemo(() => {
    const pendingIds = pendingWishlistProposals.map(p => p.activityId);
    return pendingIds.flatMap(id => {
      const spot = allActivitiesForMap.find(a => a.id === id);
      if (!spot || spot.location_lat == null || spot.location_lon == null) return [];
      return [{
        id: spot.id,
        name: spot.name,
        lat: spot.location_lat,
        lon: spot.location_lon,
        imageurlthumb: spot.imageurlthumb,
        location_address: spot.location_address,
        min_price: spot.min_price,
        max_price: spot.max_price,
      }];
    });
  }, [pendingWishlistProposals, allActivitiesForMap]);

  const savePlan = async () => {
    if (planItems.length === 0) { toast.error('Add at least one activity'); return; }
    let user;
    try {
      user = await authService.getCurrentUser();
    } catch (e) {
      user = null;
    }
    if (!user) {
      toast.info('Sign in to save and share your plan', { action: { label: 'Sign in', onClick: () => navigate('/auth') } });
      return;
    }
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
        lat: p.lat ?? null,
        lon: p.lon ?? null,
        imageurlthumb: p.imageurlthumb,
      }));
      const savedData = await tripsService.createTrip({
        user_id: user.id,
        name: planName,
        events,
        total_cost: planTotals.totalCost,
        total_events: planItems.length,
      });
      const shareToken = savedData.share_token;
      const tripId = savedData.id;
      const shareUrl = shareToken
        ? `${window.location.origin}/trip/${shareToken}`
        : `${window.location.origin}/activities?view=plan`;
      // Open share sheet — plan is cleared when the sheet is closed
      setPlanShareData({
        id: tripId,
        name: planName,
        shareUrl,
        events: planItems.map(p => ({
          title: p.name,
          date: new Date().toISOString().split('T')[0],
          time: `${p.startTime}–${p.endTime}`,
          location: p.address || '',
          description: '',
        })),
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSavingPlan(false);
    }
  };

  /** Encode plan items into a shareable URL (base64 + URL-safe) */
  const generateShareUrl = (items: PlanItem[]): string => {
    const payload = {
      n: planName,
      k: currentProfile?.name ?? 'Kid',
      i: items.map(item => ({
        id: item.activityId,
        nm: item.name,
        img: item.imageurlthumb ?? null,
        dur: item.durationMinutes,
        addr: item.address ?? null,
        lat: item.lat ?? null,
        lon: item.lon ?? null,
      })),
    };
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      return `${window.location.origin}/activities?view=plan&kidplan=${encoded}`;
    } catch {
      return `${window.location.origin}/activities?view=plan`;
    }
  };

  /** Kid (6+) submits their plan — saves to parent's wishlist, then resets */
  const submitKidPlan = () => {
    if (planItems.length === 0) { toast.error('Add at least one activity first'); return; }
    const planId = crypto.randomUUID();
    const existing = readKidProposals();
    const activeActivityIds = new Set(
      existing
        .filter(proposal => proposal.status === 'pending' || proposal.status === 'parent_suggestion')
        .map(proposal => proposal.activityId),
    );
    const proposals: KidProposal[] = planItems
      .filter(item => !activeActivityIds.has(item.activityId))
      .map(item => ({
      id: crypto.randomUUID(),
      activityId: item.activityId,
      activityName: item.name,
      activityImage: item.imageurlthumb,
      lat: item.lat,
      lon: item.lon,
      address: item.address,
      minPrice: item.minPrice,
      maxPrice: item.maxPrice,
      ageBuckets: null,
      urlmoreinfo: null,
      urlmoreinfo_status: null,
      message: `${currentProfile?.name ?? 'Kid'} wants to do this!`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      source: 'planner',
      planId,
    }));
    if (proposals.length > 0) {
      writeKidProposals([...existing, ...proposals]);
    } else {
      toast.info('These picks are already waiting in Plan');
    }
    // Show share sheet so kid can also send the plan link to parent (no email)
    const shareUrl = generateShareUrl(planItems);
    setPlanShareData({
      id: planId,
      name: `${currentProfile?.name ?? 'Kid'}'s Plan 💌`,
      shareUrl,
      events: planItems.map(p => ({
        title: p.name,
        date: new Date().toISOString().split('T')[0],
        time: `${p.startTime}–${p.endTime}`,
        location: p.address || '',
        description: '',
      })),
    });
    // Plan is cleared when the sheet closes
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
  // Kid mode — wishlist / propose to parent
  // ---------------------------------------------------------------------------
  const wishlistActivity = useCallback((activity: {
    id: string; name: string; imageurlthumb: string | null;
    location_lat?: number | null; location_lon?: number | null; location_address?: string | null;
    min_price?: number | null; max_price?: number | null;
    age_buckets?: string[] | null; urlmoreinfo?: string | null; urlmoreinfo_status?: string | null;
  }) => {
    const proposals = readKidProposals();
    if (wishlisted.has(activity.id)) {
      // Toggle off — no toast (visual heart change + Plan badge tells the story)
      const filtered = proposals.filter(proposal => !(proposal.activityId === activity.id && proposal.status === 'pending'));
      writeKidProposals(filtered);
      setWishlisted(prev => { const s = new Set(prev); s.delete(activity.id); return s; });
      return;
    }
    const existing = proposals.find(proposal =>
      proposal.activityId === activity.id && (proposal.status === 'pending' || proposal.status === 'parent_suggestion')
    );
    if (existing) {
      setWishlisted(prev => new Set([...prev, activity.id]));
      return;
    }
    const newProposal: KidProposal = {
      id: crypto.randomUUID(),
      activityId: activity.id,
      activityName: activity.name,
      activityImage: activity.imageurlthumb,
      // Geo + details so the wishlist works on the map even when filters change
      lat: activity.location_lat ?? null,
      lon: activity.location_lon ?? null,
      address: activity.location_address ?? null,
      minPrice: activity.min_price ?? null,
      maxPrice: activity.max_price ?? null,
      ageBuckets: activity.age_buckets ?? null,
      urlmoreinfo: activity.urlmoreinfo ?? null,
      urlmoreinfo_status: activity.urlmoreinfo_status ?? null,
      message: `${currentProfile?.name ?? 'Kid'} wants to go!`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      source: isLittleExplorer ? 'little' : 'planner',
      planId: null,
    };
    writeKidProposals([...proposals, newProposal]);
    setWishlisted(prev => new Set([...prev, activity.id]));
    // No toast — heart turns red + Plan tab badge updates immediately, both are visible feedback
  }, [wishlisted, currentProfile, mode]);

  /** Parent suggests an activity for the kids — kid sees it as a "Pick for you" item to accept or dismiss */
  const suggestForKid = useCallback((activity: ActivitySpot) => {
    const proposals = readKidProposals();
    // Skip if already suggested or already accepted
    const existing = proposals.find((p: any) =>
      p.activityId === activity.id && (p.status === 'parent_suggestion' || p.status === 'pending')
    );
    if (existing) {
      toast.info('Already on the kids list 🎁');
      return;
    }
    const newProposal: KidProposal = {
      id: crypto.randomUUID(),
      activityId: activity.id,
      activityName: activity.name,
      activityImage: activity.imageurlthumb,
      lat: activity.location_lat ?? null,
      lon: activity.location_lon ?? null,
      address: activity.location_address ?? null,
      minPrice: activity.min_price ?? null,
      maxPrice: activity.max_price ?? null,
      ageBuckets: activity.age_buckets ?? null,
      urlmoreinfo: activity.urlmoreinfo ?? null,
      urlmoreinfo_status: activity.urlmoreinfo_status ?? null,
      message: 'Pick for you',
      createdAt: new Date().toISOString(),
      status: 'parent_suggestion',
      source: 'parent',
      planId: null,
    };
    writeKidProposals([...proposals, newProposal]);
    toast.success('🎁 Suggested for the kids');
  }, []);

  /** Kid accepts a parent suggestion — moves it to regular pending wishlist */
  const acceptParentSuggestion = useCallback((proposalId: string) => {
    const all = readKidProposals();
    const accepted = all.find(proposal => proposal.id === proposalId);
    const alreadyPending = accepted
      ? all.some(proposal => proposal.id !== proposalId && proposal.activityId === accepted.activityId && proposal.status === 'pending')
      : false;
    const updated = all.map(proposal => {
      if (proposal.id !== proposalId) return proposal;
      return { ...proposal, status: alreadyPending ? 'approved' : 'pending' };
    });
    writeKidProposals(updated);
  }, []);

  /** Kid dismisses a parent suggestion */
  const declineParentSuggestion = useCallback((proposalId: string) => {
    const all = readKidProposals();
    const updated = all.map((p: any) => p.id === proposalId ? { ...p, status: 'declined' } : p);
    writeKidProposals(updated);
  }, []);

  // Mobile UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailActivity, setDetailActivity] = useState<ActivitySpot | null>(null);
  const [mapPlanOnly, setMapPlanOnly] = useState(false); // when true, map shows only plan items

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={cn('min-h-[100dvh]', isLittleExplorer ? 'bg-gradient-to-b from-orange-50 to-pink-50' : 'bg-background')}>

      {/* ── Sticky top header ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

        {/* Row 1: Brand — tappable logo navigates home */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          {isLittleExplorer ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl">🌟</span>
              <span className="text-xl font-black text-orange-500 truncate">Hi {currentProfile?.name ?? 'Explorer'}!</span>
            </div>
          ) : mode === 'kid' ? (
            <span className="text-xl font-bold truncate">{currentProfile?.emoji ?? '🧒'} My Day</span>
          ) : (
            <button onClick={() => navigate('/')} className="text-xl font-black text-primary tracking-tight tap-highlight truncate">
              FamActify
            </button>
          )}
          <RegionPill className="bg-primary/10 border-primary/20 text-foreground" />
        </div>

        {/* Row 2: Search + Map + Filter (one compact row) */}
        {!isLittleExplorer && (
          <div className="flex items-center gap-2 px-4 pb-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search activities…"
                className="h-11 w-full rounded-full bg-muted/80 border-0 pl-10 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tap-highlight">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={enterMoodMode}
                  aria-label="Smart suggestions"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-2.5 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 border border-pink-200 flex items-center gap-1 text-xs font-semibold tap-highlight active:scale-95 transition-transform"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Smart
                </button>
              )}
            </div>
            <button
              onClick={() => setViewMode('map')}
              aria-label="Open map view"
              className="shrink-0 w-11 h-11 rounded-full bg-muted/80 flex items-center justify-center tap-highlight active:scale-95 transition-transform"
            >
              <MapIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setFiltersOpen(true)}
              aria-label="Open filters"
              className={cn(
                'shrink-0 w-11 h-11 rounded-full flex items-center justify-center tap-highlight active:scale-95 transition-transform relative',
                activeFilterCount > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-foreground',
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 border-2 border-background">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Mood Suggest view ── */}
      {viewMode === 'mood' && (
        <MoodSuggest
          matchCount={totalCount}
          loading={loading}
          onFilterChange={applyMoodFilters}
          onShowResults={() => setViewMode('grid')}
          onReset={() => { clearFilters(); setViewMode('grid'); }}
          familyAges={familyAges}
        />
      )}

      {/* ── Result count ── */}
      {viewMode !== 'mood' && !loading && !isLittleExplorer && activities.length > 0 && (
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'activity' : 'activities'}
            {` in ${country.name}`}
            {activeFilterCount > 0 && ' · filtered'}
          </span>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-primary font-medium tap-highlight">Clear all</button>
          )}
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && viewMode !== 'mood' && (
        <div className="px-4 py-3 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden animate-pulse flex gap-3 p-3">
              <div className="w-24 h-24 bg-muted rounded-xl shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && activities.length === 0 && viewMode !== 'mood' && (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-base font-semibold mb-1">No activities found</p>
          <p className="text-sm text-muted-foreground mb-6">Try adjusting your filters</p>
          <button onClick={clearFilters} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight">
            Clear filters
          </button>
        </div>
      )}

      {/* ── Little Explorer assigned playlists ── */}
      {!loading && isLittleExplorer && viewMode !== 'mood' && assignedFamilyPlaylists.length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-orange-600">🎁 Picked for you</p>
              <p className="text-xs text-orange-700/80">
                {selectedFamilyPlaylist ? selectedFamilyPlaylist.title : `${assignedFamilyPlaylists.length} playlist${assignedFamilyPlaylists.length === 1 ? '' : 's'} from your grown-up`}
              </p>
            </div>
            {selectedFamilyPlaylist && (
              <button onClick={() => selectFamilyPlaylist('')} className="h-9 px-3 rounded-full bg-white border border-orange-200 text-xs font-bold text-orange-700 tap-highlight">
                All picks
              </button>
            )}
          </div>

          {!selectedFamilyPlaylist && (
            <div className="grid grid-cols-1 gap-3">
              {assignedFamilyPlaylists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => selectFamilyPlaylist(playlist.id)}
                  className="w-full rounded-3xl bg-gradient-to-br from-orange-100 via-pink-100 to-amber-100 border border-orange-200 p-4 text-left shadow-sm tap-highlight active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center text-3xl shrink-0">🎁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-orange-900 truncate">{playlist.title}</p>
                      <p className="text-sm font-semibold text-orange-700">{playlist.items.length} fun picks</p>
                      <p className="text-xs text-orange-700/70 truncate">Tap to browse big cards</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-orange-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Little Explorer grid ── */}
      {!loading && isLittleExplorer && viewMode !== 'mood' && activities.length > 0 && (assignedFamilyPlaylists.length === 0 || !!selectedFamilyPlaylist) && (
        <div className="px-4 py-3 grid grid-cols-1 gap-4">
          {activities.map(activity => {
            const displayImage = activity.json?.images?.[0] || activity.imageurlthumb;
            const visual = getActivityVisual(activity);
            const categoryEmoji = KID_CATEGORY_EMOJIS[activity.primary_category ?? ''] ?? '⭐';
            const isWishlisted = wishlisted.has(activity.id);
            return (
              <div key={activity.id} className="rounded-3xl overflow-hidden shadow-lg bg-card active:scale-[0.98] transition-transform relative">
                <div className="relative h-52">
                  {displayImage ? (
                    <img src={displayImage} alt={activity.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn('h-52 flex items-center justify-center text-7xl', visual.className)}>
                      {categoryEmoji}
                    </div>
                  )}
                  <span className="absolute top-3 right-3 w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-2xl">
                    {categoryEmoji}
                  </span>
                </div>
                <div className="p-4 flex items-center gap-3">
                  <h3 className="flex-1 text-lg font-black leading-tight">{activity.name}</h3>
                  <button
                    onClick={() => wishlistActivity(activity)}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    className={cn(
                      'shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all tap-highlight active:scale-90',
                      isWishlisted ? 'bg-red-100' : 'bg-muted',
                    )}
                  >
                    {isWishlisted ? '❤️' : '🤍'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Parent / Kid feed ── */}
      {!loading && !isLittleExplorer && viewMode !== 'mood' && activities.length > 0 && (
        <div className="px-4 py-2 space-y-3">
          {/* Scavenger Hunts entry banner — only at top of feed */}
          {currentPage === 0 && (
            <button
              onClick={() => navigate('/hunts')}
              className="w-full text-left rounded-2xl overflow-hidden border border-pink-200 bg-gradient-to-r from-pink-100 via-purple-100 to-amber-100 p-4 flex items-center gap-3 tap-highlight active:scale-[0.99] transition-transform"
            >
              <span className="text-3xl shrink-0">🔍</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-pink-800">Scavenger Hunts</p>
                <p className="text-xs text-pink-700/80 leading-snug">Place-based mini-adventures with clues, stops, and playful challenges.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-pink-700" />
            </button>
          )}
          {activities.map(activity => {
            const displayImage = activity.json?.images?.[0] || activity.imageurlthumb;
            const visual = getActivityVisual(activity);
            const FallbackIcon = visual.Icon;
            const inPlan = planItems.some(p => p.activityId === activity.id);
            const price = getPriceDisplay(activity);
            const isWishlisted = wishlisted.has(activity.id);

            return (
              <button
                key={activity.id}
                onClick={() => setDetailActivity(activity)}
                className="w-full text-left rounded-2xl border bg-card overflow-hidden active:scale-[0.98] transition-transform shadow-sm tap-highlight"
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                    {displayImage ? (
                      <img src={displayImage} alt={activity.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={cn('w-full h-full flex items-center justify-center', visual.className)}>
                        <FallbackIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-1">{activity.name}</h3>
                      {activity.location_address && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 line-clamp-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {activity.location_address}
                        </p>
                      )}
                      {activity.event_starttime && (
                        <p className="text-xs font-semibold text-primary mt-0.5">
                          🎟️ {formatDate(activity.event_starttime, regionConfig)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{price}</span>
                        {activity.duration_minutes && (
                          <span className="text-xs text-muted-foreground">· {activity.duration_minutes} min</span>
                        )}
                      </div>
                      {mode !== 'kid' ? (
                        <button
                          onClick={e => { e.stopPropagation(); inPlan ? removeFromPlan(activity.id) : addToPlan(activity); }}
                          className={cn('h-8 px-3 rounded-full text-xs font-semibold tap-highlight transition-colors',
                            inPlan ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {inPlan ? '✓ In plan' : '+ Plan'}
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); wishlistActivity(activity); }}
                          className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-lg tap-highlight"
                        >
                          {isWishlisted ? '❤️' : '🤍'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* Tags row */}
                {(activity.involvement || (activity.age_buckets?.length ?? 0) > 0 || activity.fenced || activity.accessibility_stroller) && (
                  <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
                    {activity.involvement && (
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        activity.involvement === 'active_together' ? 'bg-green-100 text-green-700' :
                        activity.involvement === 'supervise' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {activity.involvement === 'active_together' ? '🤝 Together' :
                         activity.involvement === 'supervise' ? '👀 Watch' : '🚗 Drop & Go'}
                      </span>
                    )}
                    {activity.age_buckets?.slice(0, 2).map(age => (
                      <span key={age} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">{age} yrs</span>
                    ))}
                    {(activity.fenced || activity.tags?.includes('fenced')) && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">🔒 Fenced</span>
                    )}
                    {(activity.accessibility_stroller || activity.tags?.includes('stroller-friendly')) && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">🚼 Stroller</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Load more ── */}
      {!loading && hasMore && viewMode !== 'mood' && (
        <div className="px-4 py-4">
          <button
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full h-12 rounded-full border border-border text-sm font-medium text-muted-foreground tap-highlight disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading…' : `Load more (${totalCount - activities.length} more)`}
          </button>
        </div>
      )}

      {/* Map FAB removed — map button now lives in the sticky header (always reachable) */}

      {/* ── Plan sticky bar (above tab bar) ── */}
      {planItems.length > 0 && viewMode !== 'plan' && (
        <div className="fixed left-0 right-0 z-40 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}>
          <button
            onClick={() => setViewMode('plan')}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground shadow-xl flex items-center justify-between px-5 tap-highlight active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="w-4 h-4" />
              <span>My Plan</span>
              {planTotals.overrunsBy > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">⚠️ Overruns</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-80">{planTotals.totalMinutes} min</span>
              <span className="w-7 h-7 rounded-full bg-white text-primary text-xs font-bold flex items-center justify-center">{planItems.length}</span>
            </div>
          </button>
        </div>
      )}

      {/* ── Map full-screen overlay (sits above content, leaves bottom tab bar visible) ── */}
      {viewMode === 'map' && (() => {
        // Build the places list — full set, or plan items + visible Plan proposals if entered from plan
        const planIds = new Set(planItems.map(p => p.activityId));
        const pendingProposals = visiblePlanProposals.filter(p => !planIds.has(p.activityId));
        const pendingWishlistIds = new Set(pendingProposals.map(p => p.activityId));
        const showIds = new Set([...planIds, ...pendingWishlistIds]);

        // Synthetic places from plan items + wishlist proposals — uses self-contained coords,
        // so the map works even when current filters exclude these activities.
        const planPlaces = planItems
          .filter(p => p.lat != null && p.lon != null)
          .map(p => ({
            id: p.activityId, name: p.name, lat: p.lat as number, lon: p.lon as number,
            imageurlthumb: p.imageurlthumb, location_address: p.address,
            min_price: p.minPrice, max_price: p.maxPrice,
            age_buckets: null, urlmoreinfo: null, urlmoreinfo_status: null,
          }));
        const wishPlaces = pendingProposals
          .filter((p: any) => p.lat != null && p.lon != null)
          .map((p: any) => ({
            id: p.activityId, name: p.activityName, lat: p.lat, lon: p.lon,
            imageurlthumb: p.activityImage, location_address: p.address ?? null,
            min_price: p.minPrice ?? null, max_price: p.maxPrice ?? null,
            age_buckets: p.ageBuckets ?? null,
            urlmoreinfo: p.urlmoreinfo ?? null, urlmoreinfo_status: p.urlmoreinfo_status ?? null,
          }));

        const mapPlaces = mapPlanOnly
          ? // Merge plan + wishlist (unique by id), prefer the version from `places` if present
            (() => {
              const byId = new Map<string, any>();
              planPlaces.forEach(p => byId.set(p.id, p));
              wishPlaces.forEach(p => { if (!byId.has(p.id)) byId.set(p.id, p); });
              // Override with full data from current places if available (richer details)
              places.forEach(p => { if (byId.has(p.id)) byId.set(p.id, p); });
              return Array.from(byId.values());
            })()
          : places;

        // Auto-center on plan + wishlist items when in plan-only mode
        const planCenter = mapPlanOnly
          ? (() => {
              const coords = mapPlaces.map(p => ({ lat: p.lat, lon: p.lon }));
              if (coords.length === 0) return center;
              const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
              const lon = coords.reduce((s, c) => s + c.lon, 0) / coords.length;
              return { lat, lon };
            })()
          : center;
        return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-background" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
          {/* Top controls — always visible above the map */}
          <div
            className="absolute left-0 right-0 z-10 flex items-center gap-2 px-3 flex-wrap"
            style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          >
            <button
              onClick={() => {
                if (mapPlanOnly) { setMapPlanOnly(false); setViewMode('plan'); }
                else { setViewMode('grid'); }
              }}
              className="h-10 pl-3 pr-4 rounded-full bg-background border border-border shadow-md flex items-center gap-2 text-sm font-medium tap-highlight"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleLocateMe}
              disabled={locatingGPS}
              className={cn('h-10 px-4 rounded-full shadow-md flex items-center gap-2 text-sm font-medium tap-highlight',
                userLocation ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'
              )}
            >
              <Locate className="w-4 h-4" />
              {locatingGPS ? 'Locating…' : userLocation ? 'Located ✓' : 'GPS'}
            </button>
            {/* Plan-only ↔ All toggle */}
            {(planItems.length > 0 || (mapPlanOnly && pendingWishlistIds.size > 0)) && (
              <button
                onClick={() => setMapPlanOnly(prev => !prev)}
                className={cn('h-10 px-4 rounded-full shadow-md flex items-center gap-2 text-sm font-medium tap-highlight',
                  mapPlanOnly ? 'bg-background border border-border' : 'bg-primary text-primary-foreground'
                )}
              >
                {mapPlanOnly
                  ? `Show all activities`
                  : `Show only plan${pendingWishlistIds.size > 0 ? ` + ${pendingWishlistIds.size} wishlist` : ''}`}
              </button>
            )}
            {!mapPlanOnly && userLocation && distanceOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setNearbyKm(prev => prev === opt.value ? null : opt.value)}
                className={cn('h-8 px-3 rounded-full shadow-md text-xs font-medium tap-highlight',
                  nearbyKm === opt.value ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <MapView
            places={mapPlaces}
            center={planCenter}
            userLocation={userLocation}
            nearbyKm={mapPlanOnly ? null : nearbyKm}
            onSelect={id => setSelectedId(id)}
            onAddToPlan={id => {
              const a = allActivitiesForMap.find(x => x.id === id);
              if (a) { addToPlan(a); return; }
              // Fall back to wishlist proposal (wishlist may not be in current filtered feed)
              const wp = pendingProposals.find((p: any) => p.activityId === id);
              if (wp) {
                addToPlan({
                  id: wp.activityId,
                  name: wp.activityName,
                  duration_minutes: 60,
                  min_price: wp.minPrice ?? null,
                  max_price: wp.maxPrice ?? null,
                  location_address: wp.address ?? null,
                  location_lat: wp.lat ?? null,
                  location_lon: wp.lon ?? null,
                  imageurlthumb: wp.activityImage ?? null,
                } as any);
              }
            }}
            planItemIds={planItems.map(p => p.activityId)}
            wishlistItemIds={Array.from(pendingWishlistIds)}
            className="h-full"
          />
          {/* Color legend (when colored markers are meaningful — plan and/or wishlist present) */}
          {(planItems.length > 0 || pendingWishlistIds.size > 0) && (
            <div
              className="absolute left-3 z-10 flex flex-col gap-1 px-2.5 py-1.5 rounded-xl bg-background/95 backdrop-blur shadow-md border border-border text-[11px]"
              style={{ bottom: 12 }}
            >
              {planItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                  <span>In plan</span>
                </div>
              )}
              {pendingWishlistIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                  <span>Kid wishlist</span>
                </div>
              )}
              {!mapPlanOnly && (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
                  <span>All activities</span>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })()}

      {/* ── Plan full-screen overlay (sits above content, leaves bottom tab bar visible) ── */}
      {viewMode === 'plan' && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-background flex flex-col" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 64px)' }}>
          {/* Top bar */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center gap-3 shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              className="flex-1 text-base font-semibold bg-transparent border-0 focus:outline-none"
              placeholder="My Plan"
            />
            {planItems.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Clear plan?')) setPlanItems([]); }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10 tap-highlight"
                aria-label="Clear plan"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Time row */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/30 text-sm shrink-0">
            <span className="text-muted-foreground">Start</span>
            <input type="time" value={sessionStartTime} onChange={e => setSessionStartTime(e.target.value)} className="border rounded-lg px-2 py-1 text-sm bg-background" />
            <span className="text-muted-foreground">End</span>
            <input type="time" value={sessionFinishTime} onChange={e => setSessionFinishTime(e.target.value)} className="border rounded-lg px-2 py-1 text-sm bg-background" />
            {planTotals.overrunsBy > 0 && (
              <span className="ml-auto text-xs text-destructive font-semibold">⚠️ +{Math.ceil(planTotals.overrunsBy)} min over</span>
            )}
          </div>
          {/* Kids wishlist */}
          {(() => {
            const pendingWishlist = pendingWishlistProposals;
            const parentSuggestions = parentSuggestionProposals;
            if (pendingWishlist.length === 0 && (parentSuggestions.length === 0 || mode === 'parent')) return null;
            return (
              <>
                {/* Parent suggestions — visible to kids */}
                {parentSuggestions.length > 0 && mode !== 'parent' && (
                  <div className="border-b bg-purple-50 shrink-0">
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-700">🎁 Picked for you</span>
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">{parentSuggestions.length}</span>
                    </div>
                    <div className="divide-y divide-purple-100 max-h-36 overflow-y-auto">
                      {parentSuggestions.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                          {p.activityImage ? (
                            <img src={p.activityImage} alt={p.activityName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-purple-200 flex items-center justify-center text-lg shrink-0">🎁</div>
                          )}
                          <p className="flex-1 text-sm font-medium truncate">{p.activityName}</p>
                          <button onClick={() => acceptParentSuggestion(p.id)} aria-label="Looks fun!" className="shrink-0 h-8 px-3 rounded-full bg-purple-500 text-white text-xs font-semibold tap-highlight">❤️ Yes!</button>
                          <button onClick={() => declineParentSuggestion(p.id)} aria-label="No thanks" className="shrink-0 w-8 h-8 rounded-full hover:bg-purple-200 flex items-center justify-center tap-highlight">
                            <X className="w-3.5 h-3.5 text-purple-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Kid wishlist (also visible to parent so they can act on it) */}
                {pendingWishlist.length > 0 && (
                  <div className="border-b bg-orange-50 shrink-0">
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-sm font-semibold text-orange-700">💌 Kids' Wishlist</span>
                      <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">{pendingWishlist.length}</span>
                    </div>
                    <div className="divide-y divide-orange-100 max-h-36 overflow-y-auto">
                      {pendingWishlist.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
                          {p.activityImage ? (
                            <img src={p.activityImage} alt={p.activityName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center text-lg shrink-0">🎪</div>
                          )}
                          <p className="flex-1 text-sm font-medium truncate">{p.activityName}</p>
                          <button onClick={() => addProposalToPlan(p)} className="shrink-0 h-8 px-3 rounded-full bg-orange-500 text-white text-xs font-semibold tap-highlight">+ Add</button>
                          <button onClick={() => dismissProposal(p.id)} className="shrink-0 w-8 h-8 rounded-full hover:bg-orange-200 flex items-center justify-center tap-highlight">
                            <X className="w-3.5 h-3.5 text-orange-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
          {/* Quick actions row — visible whenever there's plan or currently visible Plan proposals */}
          {(planItems.length > 0 || visiblePlanProposals.length > 0) && (
            <div className="flex gap-2 px-4 pt-3 pb-1 shrink-0">
              <button
                onClick={() => { setMapPlanOnly(true); setViewMode('map'); }}
                className="flex-1 h-10 rounded-full bg-muted text-foreground text-sm font-medium tap-highlight active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
              >
                <MapIcon className="w-4 h-4" /> Show on map
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className="flex-1 h-10 rounded-full bg-muted text-foreground text-sm font-medium tap-highlight active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add more
              </button>
            </div>
          )}
          {/* Plan items */}
          {planItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <span className="text-5xl">🗓️</span>
              <p className="text-base font-semibold">No activities in plan yet</p>
              <p className="text-sm text-muted-foreground">
                {visiblePlanProposals.length > 0
                  ? 'Tap “+ Add” on a wishlist item above, or browse to add more.'
                  : 'Browse and tap "+ Plan" to build your day'}
              </p>
              <button onClick={() => setViewMode('grid')} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight mt-2">Browse activities</button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Items list */}
              <div className="divide-y">
                {planItems.map((item, idx) => {
                  const fullActivity = activities.find(a => a.id === item.activityId);
                  const priceLabel = item.minPrice == null && item.maxPrice == null
                    ? null
                    : item.minPrice === 0 && (item.maxPrice == null || item.maxPrice === 0)
                      ? 'Free'
                      : formatPriceRange(item.minPrice, item.maxPrice, regionConfig);
                  return (
                    <div key={item.activityId} className="flex gap-3 px-4 py-3 items-center">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">{idx + 1}</div>
                      <button
                        onClick={() => fullActivity && setDetailActivity(fullActivity)}
                        disabled={!fullActivity}
                        className="flex flex-1 items-center gap-3 min-w-0 text-left tap-highlight rounded-lg active:scale-[0.99] transition-transform disabled:opacity-100 disabled:active:scale-100"
                      >
                        {item.imageurlthumb ? (
                          <img src={item.imageurlthumb} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <CalendarDays className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.startTime}–{item.endTime} · {item.durationMinutes} min{priceLabel ? ` · ${priceLabel}` : ''}</p>
                          {item.address && <p className="text-xs text-muted-foreground truncate">📍 {item.address}</p>}
                        </div>
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => movePlanItem(idx, 'up')} disabled={idx === 0} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 tap-highlight">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 15l-6-6-6 6"/></svg>
                        </button>
                        <button onClick={() => movePlanItem(idx, 'down')} disabled={idx === planItems.length - 1} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center disabled:opacity-30 tap-highlight">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        <button onClick={() => removeFromPlan(item.activityId)} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive tap-highlight">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Plan footer */}
          <div className="px-4 py-3 border-t bg-card space-y-2 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            {planItems.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{planItems.length} stops · {planTotals.totalMinutes} min total</span>
                {planTotals.totalCost > 0 && (
                  <span className="font-semibold">{formatPriceRange(planTotals.totalCost, planTotals.totalCost, regionConfig)}</span>
                )}
              </div>
            )}
            {mode === 'kid' ? (
              <button onClick={submitKidPlan} disabled={savingPlan || planItems.length === 0} className="w-full h-11 rounded-2xl bg-orange-500 text-white text-sm font-semibold tap-highlight disabled:opacity-50">
                {savingPlan ? 'Sending…' : '💌 Send to parent'}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={openFamilyPlaylistCreator} disabled={planItems.length === 0} className="h-11 rounded-2xl bg-orange-500 text-white text-sm font-semibold tap-highlight disabled:opacity-50">
                  🎁 Kid playlist
                </button>
                <button onClick={savePlan} disabled={savingPlan || planItems.length === 0} className="h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight disabled:opacity-50">
                  {savingPlan ? 'Saving…' : '💾 Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create family playlist sheet ── */}
      <Sheet open={familyPlaylistOpen} onOpenChange={setFamilyPlaylistOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-5 pb-5">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>🎁 Make a kid playlist</SheetTitle>
            <p className="text-sm text-muted-foreground">
              Send these {planItems.length} activities to a kid profile. They will see it as “Picked for you” in Little Explorer / Kid mode.
            </p>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Playlist title</label>
              <Input value={familyPlaylistTitle} onChange={e => setFamilyPlaylistTitle(e.target.value)} placeholder="Saturday picks for Tomsy" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Send to</label>
              <select
                value={familyPlaylistAssigneeId}
                onChange={e => setFamilyPlaylistAssigneeId(e.target.value)}
                className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
              >
                {childProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.emoji} {profile.name} — {profile.mode === 'little-explorer' ? 'Little Explorer' : 'Kid'}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3 space-y-2 max-h-40 overflow-y-auto">
              {planItems.map((item, index) => (
                <div key={item.activityId} className="flex items-center gap-2 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
            <button onClick={createFamilyPlaylist} className="w-full h-12 rounded-2xl bg-orange-500 text-white font-bold tap-highlight">
              Send playlist
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Activity detail bottom sheet ── */}
      <Sheet open={!!detailActivity} onOpenChange={open => !open && setDetailActivity(null)}>
        <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl px-0 pt-0 pb-0 overflow-hidden flex flex-col">
          {detailActivity && (() => {
            const activity = detailActivity;
            const images = activity.json?.images || [];
            const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;
            const displayDescription = cleanDisplayText(activity.description);
            const visual = getActivityVisual(activity);
            const FallbackIcon = visual.Icon;
            const inPlan = planItems.some(p => p.activityId === activity.id);
            const price = getPriceDisplay(activity);
            const isWishlisted = wishlisted.has(activity.id);
            const navUrls = getNavigationUrls(activity);
            return (
              <>
                {/* Hero image */}
                <div className="relative h-52 shrink-0">
                  {displayImage ? (
                    <img src={displayImage} alt={activity.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn('h-full flex items-center justify-center', visual.className)}>
                      <FallbackIcon className="w-16 h-16 opacity-60" />
                    </div>
                  )}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/60" />
                  <SheetClose className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </SheetClose>
                  {activity.primary_category && (
                    <span className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/40 text-white text-xs font-semibold backdrop-blur-sm">
                      {KID_CATEGORY_EMOJIS[activity.primary_category] ?? ''} {activity.primary_category}
                    </span>
                  )}
                </div>
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="px-5 pt-4 pb-6 space-y-4">
                    <div>
                      <h2 className="text-xl font-bold leading-tight">{activity.name}</h2>
                      {activity.involvement && (
                        <span className={cn('inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full text-xs font-semibold',
                          activity.involvement === 'active_together' ? 'bg-green-100 text-green-700' :
                          activity.involvement === 'supervise' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {activity.involvement === 'active_together' ? '🤝 Together' :
                           activity.involvement === 'supervise' ? '👀 Watch from Side' : '🚗 Drop & Go'}
                        </span>
                      )}
                    </div>
                    {/* Key info pills */}
                    <div className="flex flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm font-semibold">
                        <Euro className="w-3.5 h-3.5" />{price}
                      </span>
                      {activity.duration_minutes && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                          <Timer className="w-3.5 h-3.5 text-muted-foreground" />{activity.duration_minutes} min
                        </span>
                      )}
                      {(activity.age_buckets?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />{activity.age_buckets.join(', ')} yrs
                        </span>
                      )}
                    </div>
                    {/* Location */}
                    {activity.location_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{activity.location_address}</span>
                      </div>
                    )}
                    {(activity.location_address || typeof activity.location_lat === 'number') && (
                      <div className="grid grid-cols-2 gap-2">
                        <a href={navUrls.google} target="_blank" rel="noopener noreferrer" className="h-10 rounded-2xl border border-border flex items-center justify-center text-sm font-semibold tap-highlight">
                          Google Maps
                        </a>
                        <a href={navUrls.waze} target="_blank" rel="noopener noreferrer" className="h-10 rounded-2xl border border-border flex items-center justify-center text-sm font-semibold tap-highlight">
                          Waze
                        </a>
                      </div>
                    )}
                    {/* Event date */}
                    {activity.event_starttime && (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/10 rounded-xl text-sm font-semibold text-primary">
                        🎟️ {formatDate(activity.event_starttime, regionConfig)} at {formatTime(activity.event_starttime, regionConfig)}
                      </div>
                    )}
                    {/* Description */}
                    {displayDescription && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{displayDescription}</p>
                    )}
                    {/* Highlights */}
                    {(activity.highlights?.length ?? 0) > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Highlights</p>
                        {activity.highlights.map((h: string) => (
                          <div key={h} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">✓</span>
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Accessibility */}
                    {(activity.accessibility_wheelchair || activity.accessibility_stroller || activity.sensory_friendly || activity.transit_accessible || activity.fenced || activity.facilities_restrooms) && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accessibility</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activity.accessibility_wheelchair && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">♿ Wheelchair</span>}
                          {activity.accessibility_stroller && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">🚼 Stroller</span>}
                          {activity.sensory_friendly && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">🤫 Sensory friendly</span>}
                          {activity.transit_accessible && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">🚇 Transit</span>}
                          {activity.fenced && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">🔒 Fenced</span>}
                          {activity.facilities_restrooms && <span className="px-2.5 py-1 bg-muted rounded-full text-xs">🚻 Restrooms</span>}
                        </div>
                      </div>
                    )}
                    {/* Tags */}
                    {(activity.activity_type?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {activity.activity_type.map((type: string) => (
                          <span key={type} className="px-2.5 py-1 bg-muted/60 rounded-full text-xs text-muted-foreground">{type}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Bottom action bar */}
                <div className="px-5 py-3 border-t bg-background flex gap-3 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                  {activity.urlmoreinfo && activity.urlmoreinfo_status === 'ok' && (
                    <a href={activity.urlmoreinfo} target="_blank" rel="noopener noreferrer" className="h-12 px-4 rounded-2xl border border-border flex items-center justify-center text-sm font-medium tap-highlight shrink-0">
                      Web ↗
                    </a>
                  )}
                  {typeof activity.location_lat === 'number' && (
                    <button onClick={() => { setDetailActivity(null); handleShowOnMap(activity); }} className="h-12 px-4 rounded-2xl border border-border flex items-center justify-center tap-highlight shrink-0">
                      <MapIcon className="w-4 h-4" />
                    </button>
                  )}
                  {canEdit(activity) && (
                    <button onClick={() => { setDetailActivity(null); navigate(`/activities/${activity.id}/edit`); }} className="h-12 px-4 rounded-2xl border border-border text-sm font-medium tap-highlight shrink-0">Edit</button>
                  )}
                  {mode === 'kid' ? (
                    <button
                      onClick={() => { wishlistActivity(activity); setDetailActivity(null); }}
                      className={cn('flex-1 h-12 rounded-2xl text-sm font-semibold tap-highlight', isWishlisted ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground')}
                    >
                      {isWishlisted ? '❤️ Wishlisted' : '🤍 Add to Wishlist'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => { suggestForKid(activity); setDetailActivity(null); }}
                        aria-label="Suggest to kid"
                        className="h-12 px-4 rounded-2xl border border-border text-sm font-medium tap-highlight shrink-0"
                      >
                        🎁 Suggest
                      </button>
                      <button
                        onClick={() => { inPlan ? removeFromPlan(activity.id) : addToPlan(activity); setDetailActivity(null); }}
                        className={cn('flex-1 h-12 rounded-2xl text-sm font-semibold tap-highlight', inPlan ? 'bg-muted text-foreground border border-border' : 'bg-primary text-primary-foreground')}
                      >
                        {inPlan ? '✓ In plan — remove' : '+ Add to Plan'}
                      </button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Filter sheet (full-screen) ── */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none p-0 border-0 flex flex-col gap-0">
          <SheetHeader className="px-5 border-b shrink-0 flex-row items-center justify-between space-y-0" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
            <SheetTitle className="text-base font-semibold">
              Filters{activeFilterCount > 0 ? ` · ${activeFilterCount} active` : ''}
            </SheetTitle>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-sm text-primary font-medium tap-highlight mr-10">Clear all</button>
            )}
            {/* Built-in SheetClose (X) is rendered automatically by SheetContent at top-right */}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
            {/* Mood quick-action — special wizard for fast filtering */}
            <button
              onClick={() => { setFiltersOpen(false); enterMoodMode(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 border border-pink-200 tap-highlight active:scale-[0.99] transition-transform"
            >
              <Sparkles className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">Smart Mood Suggestions</p>
                <p className="text-xs text-pink-600/80">Answer 4 questions, get matched activities</p>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* City */}
            {availableCities.length > 0 && (
              <ScalableMultiPicker label="City / Area" emoji="📍" options={availableCities} selected={selectedCities} onChange={setSelectedCities} emptyLabel="All cities" searchPlaceholder="Search cities…" />
            )}
            {/* Curated lists */}
            {curatedLists.length > 0 && (
              <ScalableSinglePicker
                label="Curated Lists" emoji="📋"
                options={curatedLists.map(l => ({ value: l.slug, label: l.title, description: l.description }))}
                selected={selectedCuratedListSlug}
                onChange={selectCuratedList}
                allLabel="All activities"
                searchPlaceholder="Search lists…"
              />
            )}
            {/* Category */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Category</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedCategories([])} className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', selectedCategories.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>All</button>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', selectedCategories.includes(cat) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {KID_CATEGORY_EMOJIS[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>
            {/* Age */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Age Group</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedAges([])} className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', selectedAges.length === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>All Ages</button>
                {AGE_BUCKETS.map(age => (
                  <button key={age} onClick={() => setSelectedAges(prev => prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age])}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', selectedAges.includes(age) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {age} yrs
                  </button>
                ))}
              </div>
            </div>
            {/* Involvement */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Involvement</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedInvolvement('')} className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', !selectedInvolvement ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Any</button>
                {INVOLVEMENT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setSelectedInvolvement(opt.value)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', selectedInvolvement === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Budget */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Budget</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setMaxPrice('any')} className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', maxPrice === 'any' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Any</button>
                {PRICE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setMaxPrice(opt.value)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', maxPrice === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Environment */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Environment</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { state: rainSuitable, set: setRainSuitable, label: '🌧️ Rain suitable' },
                  { state: indoorOnly, set: setIndoorOnly, label: '🏠 Indoor only' },
                  { state: eventsOnly, set: setEventsOnly, label: '🎟️ Events only' },
                ].map(({ state, set, label }) => (
                  <button key={label} onClick={() => set((v: boolean) => !v)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', state ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Timing */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Timing</p>
              <div className="flex flex-wrap gap-2">
                {(['any', 'now', 'today', 'tomorrow', 'weekend'] as const).map(t => (
                  <button key={t} onClick={() => setTimingFilter(t)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium capitalize transition-colors tap-highlight', timingFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {t === 'any' ? 'Anytime' : t}
                  </button>
                ))}
              </div>
            </div>
            {/* Duration */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Duration</p>
              <div className="flex flex-wrap gap-2">
                {[{ value: 'any' as const, label: 'Any' }, { value: '<60' as const, label: '< 1h' }, { value: '60-120' as const, label: '1–2h' }, { value: '120-240' as const, label: '2–4h' }, { value: '240+' as const, label: 'Full day' }].map(({ value, label }) => (
                  <button key={value} onClick={() => setDurationFilter(value)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', durationFilter === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Accessibility */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Accessibility</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { state: wheelchairAccessible, set: setWheelchairAccessible, label: '♿ Wheelchair' },
                  { state: strollerFriendly, set: setStrollerFriendly, label: '🚼 Stroller' },
                  { state: sensoryFriendly, set: setSensoryFriendly, label: '🤫 Sensory friendly' },
                  { state: transitAccessible, set: setTransitAccessible, label: '🚇 Transit' },
                  { state: fencedArea, set: setFencedArea, label: '🔒 Fenced' },
                ].map(({ state, set, label }) => (
                  <button key={label} onClick={() => set((v: boolean) => !v)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', state ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* GPS Nearby */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Nearby</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleLocateMe} disabled={locatingGPS}
                  className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight flex items-center gap-1.5',
                    userLocation ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                  <Locate className="w-3.5 h-3.5" />
                  {locatingGPS ? 'Locating…' : userLocation ? 'Located ✓' : 'Use my location'}
                </button>
                {userLocation && distanceOptions.map(opt => (
                  <button key={opt.value} onClick={() => setNearbyKm(prev => prev === opt.value ? null : opt.value)}
                    className={cn('h-9 px-4 rounded-full text-sm font-medium transition-colors tap-highlight', nearbyKm === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-4" />
          </div>
          {/* Apply */}
          <div className="px-5 py-3 border-t bg-background shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <SheetClose className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight flex items-center justify-center">
              Show {totalCount > 0 ? `${totalCount} ` : ''}activities
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Focused spot map dialog ── */}
      <Dialog open={spotModalOpen} onOpenChange={open => { setSpotModalOpen(open); if (!open) setSpotModalShowAll(false); }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {spotModalPlace && (() => {
            const inPlan = planItems.some(p => p.activityId === spotModalPlace.id);
            const navUrls = getNavigationUrls({
              name: spotModalPlace.name,
              location_lat: spotModalPlace.lat,
              location_lon: spotModalPlace.lon,
              location_address: spotModalPlace.location_address ?? null,
            });
            const otherPlaces = spotModalShowAll
              ? allActivitiesForMap.filter(a => a.id !== spotModalPlace.id && typeof a.location_lat === 'number' && typeof a.location_lon === 'number').map(a => ({
                  id: a.id, name: a.name, lat: a.location_lat!, lon: a.location_lon!,
                  imageurlthumb: a.imageurlthumb, location_address: a.location_address,
                  min_price: a.min_price, max_price: a.max_price, age_buckets: a.age_buckets,
                  urlmoreinfo: a.urlmoreinfo, urlmoreinfo_status: a.urlmoreinfo_status,
                }))
              : [];
            return (
              <>
                <div className="px-4 pt-4 pb-3 border-b space-y-2">
                  <p className="font-semibold text-base">{spotModalPlace.name}</p>
                  {spotModalPlace.location_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{spotModalPlace.location_address}</p>}
                  <p className="text-xs text-muted-foreground">{formatPriceRange(spotModalPlace.min_price ?? null, spotModalPlace.max_price ?? null, regionConfig)}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => { if (!inPlan && spotModalActivity) addToPlan(spotModalActivity); setSpotModalOpen(false); setSpotModalShowAll(false); setViewMode('plan'); }}>
                      {inPlan ? '🗓️ Go to Plan' : '+ Add & Go to Plan'}
                    </Button>
                    <Button size="sm" variant={spotModalShowAll ? 'secondary' : 'outline'} onClick={() => setSpotModalShowAll(v => !v)}>
                      <Layers className="w-3.5 h-3.5 mr-1" />{spotModalShowAll ? 'Hide others' : 'Show all'}
                    </Button>
                    <a href={navUrls.google} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                      Google Maps
                    </a>
                    <a href={navUrls.waze} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground">
                      Waze
                    </a>
                    <Button size="sm" variant="ghost" onClick={() => { setSpotModalOpen(false); setSpotModalShowAll(false); }} className="ml-auto text-muted-foreground">
                      <X className="w-3.5 h-3.5 mr-1" /> Close
                    </Button>
                  </div>
                </div>
                <div className="h-[360px]">
                  <MapView places={otherPlaces} path={[{ id: spotModalPlace.id, lat: spotModalPlace.lat, lon: spotModalPlace.lon, name: spotModalPlace.name }]} center={spotModalCenter} />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-50 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
              <X className="h-6 w-6" />
            </Button>
            {lightboxImages.length > 1 && (
              <>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-sm">{currentImageIndex + 1} / {lightboxImages.length}</div>
                <Button variant="ghost" size="icon" className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12" onClick={prevImage}><ChevronLeft className="h-8 w-8" /></Button>
                <Button variant="ghost" size="icon" className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12" onClick={nextImage}><ChevronRight className="h-8 w-8" /></Button>
              </>
            )}
            <img src={lightboxImages[currentImageIndex]} alt={`Image ${currentImageIndex + 1}`} className="max-w-full max-h-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share sheet ── */}
      {planShareData && (
        <ShareSheet
          trip={planShareData}
          hideEmail={mode === 'kid'}
          onClose={() => { setPlanShareData(null); setPlanItems([]); setViewMode('grid'); }}
        />
      )}
    </div>
  );
}
