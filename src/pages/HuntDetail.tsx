import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Users, Sparkles, Play, RotateCcw, CheckCircle2, Headphones, Zap } from 'lucide-react';
import MapView from '@/components/MapView';
import { huntsService, type ScavengerHunt, type HuntAttempt } from '@/services/huntsService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { flags } from '@/lib/flags';
import { cn } from '@/lib/utils';

export default function HuntDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const profileId = currentProfile?.id ?? 'parent-default';

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [latestAttempt, setLatestAttempt] = useState<HuntAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const h = await huntsService.getHunt(slug);
      setHunt(h);
      if (h) setLatestAttempt(await huntsService.findLatestAttempt(h.id, profileId));
      setLoading(false);
    })();
  }, [slug, profileId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="min-h-[100dvh] bg-background px-6 flex flex-col items-center justify-center text-center gap-3">
        <span className="text-5xl">🗺️</span>
        <p className="font-semibold">Hunt not found</p>
        <button onClick={() => navigate('/hunts')} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm tap-highlight">
          See all hunts
        </button>
      </div>
    );
  }

  const isInProgress = !!latestAttempt && !latestAttempt.completedAt;
  const isCompleted = !!latestAttempt?.completedAt;
  const ctaLabel = isInProgress ? 'Continue hunt' : isCompleted ? 'Play again' : 'Start hunt';
  const huntPath = [...hunt.stops]
    .sort((a, b) => a.order - b.order)
    .filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lon) && !(Math.abs(s.lat) < 0.0001 && Math.abs(s.lon) < 0.0001))
    .map((s, i) => ({
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      name: `${i + 1}. ${s.title}`,
    }));

  const hours = Math.round(hunt.durationMinutes / 60 * 10) / 10;

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      {/* Hero — full-bleed cover photo with overlaid title, host, blurb, stats */}
      <div className="relative">
        {/* Background: photo if available, gradient + emoji fallback */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/30 via-pink-200 to-amber-200">
          {hunt.coverImage ? (
            <img
              src={hunt.coverImage}
              alt={hunt.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-9xl drop-shadow-sm opacity-90">{hunt.coverEmoji}</span>
            </div>
          )}
          {/* Gradient scrim — darker at top (back button) and bottom (text) for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/80 pointer-events-none" />
        </div>

        {/* Floating back button */}
        <button
          onClick={() => navigate('/hunts')}
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/45 backdrop-blur text-white flex items-center justify-center tap-highlight active:scale-95 transition-transform"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          aria-label="Back to hunts"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </div>
        )}

        {/* Overlaid text content */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-12 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80 mb-1 drop-shadow">
            by {hunt.hostName} · {hunt.city}
          </p>
          <h1 className="text-2xl font-black tracking-tight leading-tight drop-shadow-md">{hunt.title}</h1>
          <p className="text-sm leading-snug mt-1.5 text-white/95 drop-shadow line-clamp-3">{hunt.blurb}</p>

          {/* Compact 4-stat chip strip — single row */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-[11px] font-semibold whitespace-nowrap">
              <MapPin className="w-3 h-3" /> {hunt.stops.length} stops
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-[11px] font-semibold whitespace-nowrap">
              <Clock className="w-3 h-3" /> ~{hours}h
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-[11px] font-semibold whitespace-nowrap">
              <Users className="w-3 h-3" /> {hunt.ageMin}–{hunt.ageMax}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/25 text-[11px] font-semibold whitespace-nowrap capitalize">
              <Sparkles className="w-3 h-3" /> {hunt.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Route map */}
      {huntPath.length > 0 && (
        <div className="px-5 mt-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Route map</p>
            <p className="text-[11px] text-muted-foreground">Tap pins for full names</p>
          </div>
          <div className="h-72 rounded-3xl overflow-hidden border bg-muted shadow-sm">
            <MapView
              places={[]}
              path={huntPath}
              className="rounded-3xl border-0"
            />
          </div>
        </div>
      )}

      {/* Stops preview */}
      <div className="px-5 mt-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What you'll do</p>
        <div className="rounded-2xl border bg-card divide-y">
          {hunt.stops.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <div className="flex items-center gap-2 min-w-0">
                  {s.address && <p className="text-[11px] text-muted-foreground truncate">📍 {s.address}</p>}
                  {s.clueAudio && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary shrink-0">
                      <Headphones className="w-3 h-3" /> audio guide
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credits */}
      {hunt.credits && (
        <div className="px-5 mt-4">
          <p className="text-[11px] text-muted-foreground italic leading-snug">{hunt.credits}</p>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pt-6 pb-4 sticky bottom-0 bg-background/95 backdrop-blur border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
        <div className="flex gap-2">
          {isInProgress && (
            <button
              onClick={async () => {
                if (!latestAttempt) return;
                if (window.confirm('Restart from the first stop? Your progress on this hunt will be cleared.')) {
                  await huntsService.abandonAttempt(latestAttempt.id);
                  navigate(`/hunts/${hunt.slug}/play`);
                }
              }}
              className="h-12 px-4 rounded-2xl border border-border tap-highlight"
              aria-label="Restart hunt"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => navigate(`/hunts/${hunt.slug}/play`)}
            className={cn(
              'flex-1 h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-transform shadow-lg',
              'bg-primary text-primary-foreground',
            )}
          >
            <Play className="w-4 h-4" /> {ctaLabel}
          </button>
        </div>
        {flags.scv_live_races && (
          <button
            onClick={() => navigate(`/race/create/${hunt.slug}`)}
            className="w-full mt-2 h-11 rounded-2xl border-2 border-primary/30 text-primary font-semibold text-sm flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-transform"
          >
            <Zap className="w-4 h-4" /> Race this hunt with another family
          </button>
        )}
      </div>
    </div>
  );
}
