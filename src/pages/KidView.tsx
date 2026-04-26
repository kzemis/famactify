import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';

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
}

// ---------------------------------------------------------------------------
// Kid category config
// ---------------------------------------------------------------------------
const KID_CATEGORIES = [
  { emoji: '🐾', label: 'Animals',  match: ['animals', 'nature', 'farm'] },
  { emoji: '🎨', label: 'Art',      match: ['art', 'craft', 'culture'] },
  { emoji: '🎵', label: 'Music',    match: ['music'] },
  { emoji: '🔬', label: 'Science',  match: ['science', 'education', 'stem'] },
  { emoji: '🏃', label: 'Sport',    match: ['sport', 'outdoor', 'active'] },
  { emoji: '🌿', label: 'Nature',   match: ['nature', 'park', 'outdoor', 'hike'] },
  { emoji: '🎉', label: 'Fun',      match: ['fun', 'play', 'social'] },
];

// ---------------------------------------------------------------------------
// Price display helper
// ---------------------------------------------------------------------------
function priceLabel(min: number | null, max: number | null): string {
  if (!min && !max) return 'Free 🆓';
  if (min === 0 && max === 0) return 'Free 🆓';
  if (min && max) return `$${min}–$${max}`;
  if (min) return `From $${min}`;
  if (max) return `Up to $${max}`;
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function KidView() {
  const navigate = useNavigate();

  const [activities, setActivities] = useState<ActivitySpot[]>([]);
  const [filtered, setFiltered] = useState<ActivitySpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ActivitySpot | null>(null);
  const [selectedKidCategory, setSelectedKidCategory] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('activityspots')
        .select('id, name, imageurlthumb, description, highlights, min_price, max_price, age_buckets, duration_minutes, involvement, primary_category, tags, json')
        .order('name', { ascending: true });
      if (error) {
        toast.error('Could not load activities');
      } else {
        setActivities(data || []);
        setFiltered(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // ---------------------------------------------------------------------------
  // Search + category filter
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let result = [...activities];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(q));
    }

    if (selectedKidCategory) {
      const catConfig = KID_CATEGORIES.find(c => c.label === selectedKidCategory);
      if (catConfig) {
        result = result.filter(a => {
          const allTerms = [
            ...(a.tags || []),
            ...(a.highlights || []).map(h => h.toLowerCase()),
            a.primary_category?.toLowerCase() || '',
          ].join(' ');
          return catConfig.match.some(m => allTerms.includes(m));
        });
      }
    }

    setFiltered(result);
  }, [searchQuery, selectedKidCategory, activities]);

  // ---------------------------------------------------------------------------
  // Kid proposal
  // ---------------------------------------------------------------------------
  const submitProposal = (activity: ActivitySpot) => {
    const proposals: KidProposal[] = JSON.parse(localStorage.getItem('famactify-kid-proposals') || '[]');
    if (proposals.some(p => p.activityId === activity.id && p.status === 'pending')) {
      toast.success('Already asked! Your parent will see it 😊');
      return;
    }
    const newProposal: KidProposal = {
      id: Math.random().toString(36).slice(2),
      activityId: activity.id,
      activityName: activity.name,
      activityImage: activity.imageurlthumb,
      message: 'I want to go here!',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    proposals.push(newProposal);
    localStorage.setItem('famactify-kid-proposals', JSON.stringify(proposals));
    // Notify other tabs (AppHeader badge)
    window.dispatchEvent(new Event('storage'));
    toast.success('Asked! Your parent will see it soon 🎉');
    setSelectedActivity(null);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-orange-50">
      {/* ── Simplified header ── */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-5xl">
          {/* Logo / title */}
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎪</span>
            <span className="text-xl font-bold text-orange-500">FamActify Kids</span>
          </div>

          {/* Exit kid mode — always visible, large, warning color */}
          <Button
            variant="destructive"
            size="lg"
            onClick={() => navigate('/community')}
            className="text-sm font-bold"
          >
            <X className="w-4 h-4 mr-2" />
            Exit Kid Mode
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <p className="text-5xl mb-3">🌟</p>
          <h1 className="text-4xl font-extrabold text-orange-600 mb-2">What do you want to do today?</h1>
          <p className="text-lg text-orange-400">Pick something fun!</p>
        </div>

        {/* Category picker */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={() => setSelectedKidCategory('')}
            className={`px-4 py-2 rounded-2xl text-lg font-bold border-2 transition-colors ${
              selectedKidCategory === '' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
            }`}
          >
            ✅ Show All
          </button>
          {KID_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => setSelectedKidCategory(prev => prev === cat.label ? '' : cat.label)}
              className={`px-4 py-2 rounded-2xl text-lg font-bold border-2 transition-colors ${
                selectedKidCategory === cat.label ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-orange-200 hover:border-orange-400'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
          <Input
            placeholder="Search for something fun…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-4 text-lg rounded-2xl border-2 border-orange-200 focus:border-orange-400 bg-white"
          />
        </div>

        {/* Activity grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-3xl bg-white animate-pulse overflow-hidden shadow-md">
                <div className="h-48 bg-orange-100" />
                <div className="p-4 space-y-2">
                  <div className="h-6 bg-orange-100 rounded-xl w-3/4" />
                  <div className="h-4 bg-orange-100 rounded-xl w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-6xl mb-4">🔍</p>
            <p className="text-2xl font-bold text-orange-500">Nothing found!</p>
            <p className="text-muted-foreground mt-2">Try a different search word</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((activity) => {
              const images = activity.json?.images || [];
              const displayImage = images.length > 0 ? images[0] : activity.imageurlthumb;

              return (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="rounded-3xl bg-white shadow-md hover:shadow-xl transition-shadow overflow-hidden text-left w-full active:scale-95 transition-transform"
                >
                  {/* Image */}
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={activity.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="h-48 bg-orange-100 flex items-center justify-center">
                      <span className="text-6xl">🗺️</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-2xl font-extrabold text-gray-800 line-clamp-2 leading-tight mb-2">
                      {activity.name}
                    </h3>

                    {/* Highlights */}
                    {activity.highlights && activity.highlights.length > 0 && (
                      <ul className="space-y-0.5 mb-3">
                        {activity.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                            <span className="text-orange-400 shrink-0">✦</span>
                            <span className="line-clamp-1">{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {/* Price badge */}
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                        {priceLabel(activity.min_price, activity.max_price)}
                      </span>
                      {/* Age badge */}
                      {activity.age_buckets && activity.age_buckets.length > 0 && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                          👧 {activity.age_buckets.slice(0, 2).join(', ')} yrs
                        </span>
                      )}
                      {/* Involvement badge (TOG-03) */}
                      {activity.involvement === 'active_together' && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">🤝 We go together!</span>
                      )}
                      {activity.involvement === 'drop_go' && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold">🚗 Drop-off OK</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Activity detail modal ── */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden bg-orange-50">
          {selectedActivity && (() => {
            const images = selectedActivity.json?.images || [];
            const displayImage = images.length > 0 ? images[0] : selectedActivity.imageurlthumb;
            return (
              <>
                {/* Image */}
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={selectedActivity.name}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="h-56 bg-orange-100 flex items-center justify-center">
                    <span className="text-8xl">🗺️</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-3xl font-extrabold text-gray-800 mb-3 leading-tight">
                    {selectedActivity.name}
                  </h2>

                  {/* Highlights */}
                  {selectedActivity.highlights && selectedActivity.highlights.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">Fun things to do</p>
                      <ul className="space-y-1">
                        {selectedActivity.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-700">
                            <span className="text-orange-400 mt-0.5">✦</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Description */}
                  {selectedActivity.description && (
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      {selectedActivity.description}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
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
                    {/* Involvement badge (TOG-03) */}
                    {selectedActivity.involvement === 'active_together' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-base font-bold">🤝 We go together!</span>
                    )}
                    {selectedActivity.involvement === 'drop_go' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-base font-bold">🚗 Drop-off OK</span>
                    )}
                  </div>

                  <Button
                    className="w-full rounded-2xl text-lg py-5 font-bold bg-orange-500 hover:bg-orange-600"
                    onClick={() => setSelectedActivity(null)}
                  >
                    Looks good! 🎉
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl text-lg py-4 font-bold border-2 border-orange-300 text-orange-600 mt-2"
                    onClick={() => submitProposal(selectedActivity)}
                  >
                    Ask for this! 💌
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
