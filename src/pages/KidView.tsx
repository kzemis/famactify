import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useCountry } from '@/i18n/CountryContext';
import { countUniqueActionableKidProposals, readKidProposals, writeKidProposals } from '@/lib/kidProposals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ActivitySpot {
  id: string;
  name: string;
  imageurlthumb: string | null;
  description: string | null;
  highlights: string[] | null;
  min_price: number | null;
  max_price: number | null;
  age_buckets: string[];
  duration_minutes: number | null;
  involvement: string | null;
  primary_category: string | null;
  tags: string[] | null;
  json: any;
}

interface KidProposal {
  id: string;
  activityId: string;
  activityName: string;
  activityImage: string | null;
  message: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'declined';
  source?: 'little' | 'planner';
  planId?: string | null;
}

type KidMode = 'select' | 'little' | 'planner';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const KID_CATEGORIES = [
  { emoji: '🐾', label: 'Animals',  match: ['animals', 'nature', 'farm', 'zoo'] },
  { emoji: '🎨', label: 'Art',      match: ['art', 'craft', 'culture', 'creative'] },
  { emoji: '🔬', label: 'Science',  match: ['science', 'education', 'stem', 'learning'] },
  { emoji: '🏃', label: 'Sport',    match: ['sport', 'outdoor', 'active', 'swim'] },
  { emoji: '🌿', label: 'Nature',   match: ['nature', 'park', 'outdoor', 'hike', 'forest'] },
  { emoji: '🎉', label: 'Fun',      match: ['fun', 'play', 'social', 'game'] },
  { emoji: '🎵', label: 'Music',    match: ['music', 'dance'] },
];

function priceLabel(min: number | null, max: number | null): string {
  if (!min && !max) return 'Free 🆓';
  if (min === 0) return 'Free 🆓';
  if (min && max) return `$${min}–$${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return '';
}

function matchesCategory(activity: ActivitySpot, catLabel: string): boolean {
  const catConfig = KID_CATEGORIES.find(c => c.label === catLabel);
  if (!catConfig) return true;
  const allTerms = [
    ...(activity.tags || []),
    ...(activity.highlights || []).map(h => h.toLowerCase()),
    activity.primary_category?.toLowerCase() || '',
    activity.description?.toLowerCase() || '',
  ].join(' ');
  return catConfig.match.some(m => allTerms.includes(m));
}

// Generate a short plan id
function newPlanId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function KidView() {
  const navigate = useNavigate();
  const { countryCode } = useCountry();

  const [mode, setMode] = useState<KidMode>('select');
  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filtered, setFiltered] = useState<ActivitySpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ActivitySpot | null>(null);

  // Planner-mode wishlist
  const [wishlist, setWishlist] = useState<ActivitySpot[]>([]);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch (runs when mode changes from 'select' to an actual mode)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === 'select') return;
    const doFetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activityspots')
        .select('id, name, imageurlthumb, description, highlights, min_price, max_price, age_buckets, duration_minutes, involvement, primary_category, tags, json')
        .eq('country_code', countryCode)
        .eq('demo_enabled', true)
        .order('demo_rank', { ascending: true, nullsFirst: false })
        .order('excitement_score', { ascending: false, nullsFirst: false })
        .limit(30);
      if (error) {
        toast.error('Could not load activities');
      } else {
        setActivities(data || []);
        setFiltered(data || []);
      }
      setLoading(false);
    };
    doFetch();
  }, [mode, countryCode]);

  // ---------------------------------------------------------------------------
  // Filter
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let result = [...activities];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      result = result.filter(a => matchesCategory(a, selectedCategory));
    }
    setFiltered(result);
  }, [searchQuery, selectedCategory, activities]);

  // ---------------------------------------------------------------------------
  // Proposal helpers
  // ---------------------------------------------------------------------------
  const isAsked = useCallback((activityId: string): boolean => {
    const proposals = readKidProposals();
    return proposals.some(p => p.activityId === activityId && p.status === 'pending');
  }, []);

  const submitSingle = useCallback((activity: ActivitySpot) => {
    const proposals = readKidProposals();
    if (proposals.some(p => p.activityId === activity.id && (p.status === 'pending' || p.status === 'parent_suggestion'))) {
      toast.success('Already asked! Your parent will see it 😊');
      return;
    }
    const newProposal = {
      id: Math.random().toString(36).slice(2),
      activityId: activity.id,
      activityName: activity.name,
      activityImage: activity.imageurlthumb,
      message: 'I want to go here!',
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
      source: 'little' as const,
      planId: null,
    };
    writeKidProposals([...proposals, newProposal]);
    toast.success('Asked! Mom/Dad will see it soon 🎉');
    setSelectedActivity(null);
  }, []);

  const submitPlan = useCallback(() => {
    if (wishlist.length === 0) return;
    const proposals = readKidProposals();
    const activeActivityIds = new Set(
      proposals
        .filter(proposal => proposal.status === 'pending' || proposal.status === 'parent_suggestion')
        .map(proposal => proposal.activityId),
    );
    const planId = newPlanId();
    const now = new Date().toISOString();
    const newProposals = wishlist.flatMap(activity => {
      if (activeActivityIds.has(activity.id)) return [];
      return [{
          id: Math.random().toString(36).slice(2),
          activityId: activity.id,
          activityName: activity.name,
          activityImage: activity.imageurlthumb,
          message: 'Part of my plan!',
          createdAt: now,
          status: 'pending' as const,
          source: 'planner' as const,
          planId,
        }];
    });
    if (newProposals.length > 0) {
      writeKidProposals([...proposals, ...newProposals]);
      toast.success(`Plan sent to parent! ${newProposals.length} activities 🎉`);
    } else {
      toast.success('These picks are already waiting for parent 😊');
    }
    setWishlist([]);
    setPlanSheetOpen(false);
    navigate('/kids'); // back to mode select to show success state
    setMode('select');
  }, [wishlist, navigate]);

  const pendingAskCount = (() => {
    return countUniqueActionableKidProposals('parent', readKidProposals());
  })();

  // ---------------------------------------------------------------------------
  // Shared exit header
  // ---------------------------------------------------------------------------
  const KidHeader = ({ title, emoji, color }: { title: string; emoji: string; color: string }) => (
    <header className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-5xl">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{emoji}</span>
          <span className={`text-xl font-bold ${color}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {mode !== 'select' && (
            <button
              onClick={() => { setMode('select'); setWishlist([]); setPlanSheetOpen(false); }}
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              Switch mode
            </button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => navigate('/activities')}
            className="font-bold"
          >
            <X className="w-4 h-4 mr-1" />
            Exit
          </Button>
        </div>
      </div>
    </header>
  );

  // ---------------------------------------------------------------------------
  // ── MODE SELECT SCREEN ──
  // ---------------------------------------------------------------------------
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-yellow-50 to-white">
        <KidHeader title="FamActify Kids" emoji="🎪" color="text-orange-500" />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-12 gap-8">
          <div className="text-center">
            <p className="text-6xl mb-3">🌟</p>
            <h1 className="text-4xl font-extrabold text-orange-600 mb-2">Hey! Who's browsing?</h1>
            <p className="text-lg text-orange-400">Pick your mode and let's find something fun!</p>
            {pendingAskCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                💌 You've asked for {pendingAskCount} {pendingAskCount === 1 ? 'thing' : 'things'} — waiting for parent!
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-5 w-full max-w-lg">
            {/* Little Explorer */}
            <button
              onClick={() => setMode('little')}
              className="flex-1 bg-white rounded-3xl p-8 shadow-lg border-4 border-orange-200 hover:border-orange-400 hover:shadow-xl transition-all text-center active:scale-95 group"
            >
              <p className="text-6xl mb-3 group-hover:scale-110 transition-transform">🧒</p>
              <p className="text-2xl font-extrabold text-orange-600">Little Explorer</p>
              <p className="text-gray-400 mt-2 text-sm">Ages 3–8</p>
              <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                Big pictures, simple tapping. Ask Mom or Dad for something fun!
              </p>
            </button>

            {/* Kid Planner */}
            <button
              onClick={() => setMode('planner')}
              className="flex-1 bg-white rounded-3xl p-8 shadow-lg border-4 border-blue-200 hover:border-blue-400 hover:shadow-xl transition-all text-center active:scale-95 group"
            >
              <p className="text-6xl mb-3 group-hover:scale-110 transition-transform">🗓️</p>
              <p className="text-2xl font-extrabold text-blue-600">Kid Planner</p>
              <p className="text-gray-400 mt-2 text-sm">Ages 8+</p>
              <p className="text-gray-500 mt-3 text-sm leading-relaxed">
                Build a whole day plan and send it to your parent to approve!
              </p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ── LITTLE EXPLORER MODE ──
  // ---------------------------------------------------------------------------
  if (mode === 'little') {
    return (
      <div className="min-h-screen bg-orange-50">
        <KidHeader title="Little Explorer 🧒" emoji="🌟" color="text-orange-500" />

        <main className="container mx-auto px-4 py-6 max-w-5xl">
          {/* Hero */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-orange-600 mb-1">What do you want to do?</h1>
            <p className="text-orange-400">Tap something that looks fun!</p>
          </div>

          {/* Category picker — big emoji buttons, no text complexity */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-5 py-3 rounded-2xl text-xl font-bold border-3 transition-all active:scale-95 ${
                selectedCategory === ''
                  ? 'bg-orange-500 text-white border-orange-500 shadow-lg'
                  : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
              }`}
              style={{ border: '3px solid' }}
            >
              ✅ All
            </button>
            {KID_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(prev => prev === cat.label ? '' : cat.label)}
                className={`px-5 py-3 rounded-2xl text-xl font-bold transition-all active:scale-95 ${
                  selectedCategory === cat.label
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-white text-orange-500 hover:bg-orange-50'
                }`}
                style={{ border: '3px solid', borderColor: selectedCategory === cat.label ? '#f97316' : '#fed7aa' }}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {/* Activity grid — BIG cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-3xl bg-white animate-pulse overflow-hidden shadow-md h-72" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-2xl font-bold text-orange-500">Nothing here!</p>
              <button onClick={() => setSelectedCategory('')} className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-2xl font-bold text-lg">
                Show everything
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map((activity) => {
                const images = activity.json?.images || [];
                const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;
                const asked = isAsked(activity.id);

                return (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="rounded-3xl bg-white shadow-md hover:shadow-xl transition-all overflow-hidden text-left w-full active:scale-[0.98]"
                  >
                    {displayImage ? (
                      <img src={displayImage} alt={activity.name} className="w-full h-52 object-cover" />
                    ) : (
                      <div className="h-52 bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
                        <span className="text-7xl">🗺️</span>
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-2xl font-extrabold text-gray-800 line-clamp-2 leading-tight mb-3">
                        {activity.name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-base font-bold">
                          {priceLabel(activity.min_price, activity.max_price)}
                        </span>
                        {activity.age_buckets && activity.age_buckets.length > 0 && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-base font-bold">
                            👧 {activity.age_buckets.slice(0, 2).join(', ')} yrs
                          </span>
                        )}
                        {asked && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-base font-bold">
                            💌 Asked!
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* ── Activity detail sheet ── */}
        {selectedActivity && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setSelectedActivity(null)}>
            <div
              className="bg-orange-50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const images = selectedActivity.json?.images || [];
                const displayImage = images.length > 0 ? images[0] : selectedActivity.imageurlthumb;
                const asked = isAsked(selectedActivity.id);
                return (
                  <>
                    {displayImage ? (
                      <img src={displayImage} alt={selectedActivity.name} className="w-full h-56 object-cover" />
                    ) : (
                      <div className="h-56 bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
                        <span className="text-8xl">🗺️</span>
                      </div>
                    )}
                    <div className="p-6">
                      <h2 className="text-3xl font-extrabold text-gray-800 mb-3 leading-tight">
                        {selectedActivity.name}
                      </h2>
                      {selectedActivity.highlights && selectedActivity.highlights.length > 0 && (
                        <ul className="space-y-1 mb-4">
                          {selectedActivity.highlights.slice(0, 4).map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-gray-700 text-base">
                              <span className="text-orange-400 mt-0.5 shrink-0">✦</span>
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-2 mb-5">
                        <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-base font-bold">
                          {priceLabel(selectedActivity.min_price, selectedActivity.max_price)}
                        </span>
                        {selectedActivity.age_buckets && selectedActivity.age_buckets.length > 0 && (
                          <span className="px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-base font-bold">
                            👧 {selectedActivity.age_buckets.join(', ')} yrs
                          </span>
                        )}
                        {selectedActivity.duration_minutes && (
                          <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-base font-bold">
                            ⏱️ {selectedActivity.duration_minutes} min
                          </span>
                        )}
                      </div>
                      {asked ? (
                        <div className="w-full rounded-2xl py-4 bg-green-100 text-green-700 font-bold text-xl text-center mb-2">
                          💌 Already asked — waiting for Mom/Dad!
                        </div>
                      ) : (
                        <button
                          className="w-full rounded-2xl py-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xl transition-colors active:scale-[0.98] mb-2"
                          onClick={() => submitSingle(selectedActivity)}
                        >
                          Ask Mom/Dad for this! 💌
                        </button>
                      )}
                      <button
                        className="w-full rounded-2xl py-3 border-2 border-orange-300 text-orange-600 font-bold text-lg transition-colors hover:bg-orange-50"
                        onClick={() => setSelectedActivity(null)}
                      >
                        Keep looking 🔍
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ── KID PLANNER MODE ──
  // ---------------------------------------------------------------------------
  const inWishlist = (id: string) => wishlist.some(a => a.id === id);

  const toggleWishlist = (activity: ActivitySpot) => {
    setWishlist(prev =>
      prev.some(a => a.id === activity.id)
        ? prev.filter(a => a.id !== activity.id)
        : [...prev, activity]
    );
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <KidHeader title="Kid Planner 🗓️" emoji="🗓️" color="text-blue-600" />

      <main className="container mx-auto px-4 py-6 max-w-5xl pb-28">
        {/* Hero */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-blue-700 mb-1">Build your dream day!</h1>
          <p className="text-blue-400">Add activities to your plan, then send it to your parent.</p>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-2 rounded-2xl text-base font-bold border-2 transition-all ${
              selectedCategory === '' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-500 border-blue-200 hover:border-blue-400'
            }`}
          >
            ✅ All
          </button>
          {KID_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(prev => prev === cat.label ? '' : cat.label)}
              className={`px-4 py-2 rounded-2xl text-base font-bold border-2 transition-all ${
                selectedCategory === cat.label ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-500 border-blue-200 hover:border-blue-400'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
          <Input
            placeholder="Search for activities…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-4 text-base rounded-2xl border-2 border-blue-200 focus:border-blue-400 bg-white"
          />
        </div>

        {/* Activity grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white animate-pulse overflow-hidden h-64" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">🔍</p>
            <p className="text-xl font-bold text-blue-500">Nothing found</p>
            <button onClick={() => { setSelectedCategory(''); setSearchQuery(''); }} className="mt-3 px-5 py-2 bg-blue-500 text-white rounded-2xl font-bold">
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((activity) => {
              const images = activity.json?.images || [];
              const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;
              const added = inWishlist(activity.id);

              return (
                <div key={activity.id} className="rounded-2xl bg-white shadow overflow-hidden flex flex-col">
                  {displayImage ? (
                    <img src={displayImage} alt={activity.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <span className="text-5xl">🗺️</span>
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="font-extrabold text-base text-gray-800 line-clamp-2 leading-tight">
                      {activity.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                        {priceLabel(activity.min_price, activity.max_price)}
                      </span>
                      {activity.age_buckets && activity.age_buckets.length > 0 && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                          👧 {activity.age_buckets.slice(0, 2).join(', ')} yrs
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleWishlist(activity)}
                      className={`mt-auto w-full rounded-xl py-2 text-sm font-bold transition-all active:scale-95 ${
                        added
                          ? 'bg-blue-500 text-white'
                          : 'border-2 border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {added ? '✓ In my plan' : '+ Add to plan'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Floating plan bar ── */}
      {(wishlist.length > 0 || planSheetOpen) && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          {/* Plan sheet — slides up */}
          {planSheetOpen && (
            <div className="bg-white border-t border-blue-200 shadow-2xl max-h-[50vh] overflow-y-auto">
              <div className="container mx-auto px-4 py-4 max-w-5xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-lg text-blue-700">My Day Plan 🗓️</h3>
                  <button onClick={() => setPlanSheetOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 mb-4">
                  {wishlist.map((a, i) => (
                    <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl bg-blue-50">
                      <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {a.imageurlthumb && (
                        <img src={a.imageurlthumb} alt={a.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      )}
                      <p className="font-semibold text-sm flex-1 truncate">{a.name}</p>
                      <button onClick={() => toggleWishlist(a)} className="shrink-0 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={submitPlan}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-lg rounded-2xl transition-colors active:scale-[0.98]"
                >
                  Send plan to parent 📨 ({wishlist.length} {wishlist.length === 1 ? 'activity' : 'activities'})
                </button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Your parent will get a notification to review your plan
                </p>
              </div>
            </div>
          )}

          {/* Sticky bar */}
          <div className="bg-blue-500 text-white py-3 px-4 shadow-lg">
            <div className="container mx-auto max-w-5xl flex items-center justify-between gap-3">
              <button
                onClick={() => setPlanSheetOpen(v => !v)}
                className="flex items-center gap-2 font-bold text-base"
              >
                {planSheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                My Plan: {wishlist.length} {wishlist.length === 1 ? 'activity' : 'activities'}
              </button>
              <button
                onClick={submitPlan}
                className="px-5 py-2 bg-white text-blue-600 font-extrabold rounded-2xl text-sm hover:bg-blue-50 transition-colors active:scale-95"
              >
                Send to parent 📨
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
