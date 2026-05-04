import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Users, Sparkles, Play, RotateCcw, CheckCircle2, Headphones } from 'lucide-react';
import MapView from '@/components/MapView';
import { huntsService, type ScavengerHunt, type HuntAttempt } from '@/services/huntsService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
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

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      {/* Top bar with back */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center gap-2" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <button onClick={() => navigate('/hunts')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight" aria-label="Back to hunts">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold truncate">{hunt.title}</span>
      </div>

      {/* Cover */}
      <div className="relative h-48 bg-gradient-to-br from-primary/20 via-pink-100 to-amber-100 flex items-center justify-center">
        <span className="text-8xl drop-shadow-sm">{hunt.coverEmoji}</span>
        {isCompleted && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </div>
        )}
      </div>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 space-y-2">
        <h1 className="text-2xl font-black tracking-tight leading-tight">{hunt.title}</h1>
        <p className="text-xs text-muted-foreground">by {hunt.hostName} · {hunt.city}</p>
        <p className="text-base text-muted-foreground leading-relaxed pt-1">{hunt.blurb}</p>
      </div>

      {/* Quick facts */}
      <div className="px-5 grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stops</p>
          <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {hunt.stops.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Duration</p>
          <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5"><Clock className="w-3.5 h-3.5" /> ~{Math.round(hunt.durationMinutes / 60 * 10) / 10}h</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ages</p>
          <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5"><Users className="w-3.5 h-3.5" /> {hunt.ageMin}–{hunt.ageMax}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</p>
          <p className="font-semibold text-sm flex items-center gap-1.5 mt-0.5"><Sparkles className="w-3.5 h-3.5" /> {hunt.difficulty}</p>
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
      </div>
    </div>
  );
}
