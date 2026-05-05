import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Users, Sparkles, Play, RotateCcw, CheckCircle2, Headphones, Zap } from 'lucide-react';
import MapView from '@/components/MapView';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { huntsService, type ScavengerHunt, type HuntAttempt } from '@/services/huntsService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { flags } from '@/lib/flags';
import { cn } from '@/lib/utils';

const SLIDE_LABELS = ['About', 'Map', 'Stops'] as const;

export default function HuntDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const profileId = currentProfile?.id ?? 'parent-default';

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [latestAttempt, setLatestAttempt] = useState<HuntAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const h = await huntsService.getHunt(slug);
      setHunt(h);
      if (h) setLatestAttempt(await huntsService.findLatestAttempt(h.id, profileId));
      setLoading(false);
    })();
  }, [slug, profileId]);

  // Track active slide for indicator dots
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

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
  const slideCount = huntPath.length > 0 ? 3 : 2; // skip map slide when no coords

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar flex flex-col">
      {/* ── Carousel: 3 slides (Cover / Map / Stops) ───────────────── */}
      <div className="relative">
        <Carousel
          setApi={setCarouselApi}
          opts={{ loop: false, dragFree: false }}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {/* Slide 1: Cover hero */}
            <CarouselItem className="pl-0 basis-full">
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
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/0 to-black/85 pointer-events-none" />

                {/* Overlaid text content */}
                <div className="absolute inset-x-0 bottom-0 px-5 pb-10 pt-12 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80 mb-1 drop-shadow">
                    by {hunt.hostName} · {hunt.city}
                  </p>
                  <h1 className="text-2xl font-black tracking-tight leading-tight drop-shadow-md">{hunt.title}</h1>
                  <p className="text-sm leading-snug mt-1.5 text-white/95 drop-shadow line-clamp-3">{hunt.blurb}</p>

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
            </CarouselItem>

            {/* Slide 2: Map (only if there are coords) */}
            {huntPath.length > 0 && (
              <CarouselItem className="pl-0 basis-full">
                <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] bg-muted overflow-hidden">
                  <MapView places={[]} path={huntPath} className="absolute inset-0" />
                  {/* Map header label (so users know what slide they're on) */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/90 backdrop-blur shadow-md border text-[11px] font-bold uppercase tracking-widest pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
                    Route map
                  </div>
                  <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] text-foreground/70 bg-background/90 backdrop-blur px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
                    Tap pins for full names
                  </p>
                </div>
              </CarouselItem>
            )}

            {/* Slide 3: What you'll do (stops) */}
            <CarouselItem className="pl-0 basis-full">
              <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] bg-gradient-to-br from-amber-50 via-background to-primary/5 overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto px-4 pt-14 pb-10 no-scrollbar">
                  <div className="rounded-2xl border bg-card divide-y shadow-sm">
                    {hunt.stops.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 px-3 py-3">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.title}</p>
                          <div className="flex items-center gap-2 min-w-0 mt-0.5">
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
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/90 backdrop-blur shadow-md border text-[11px] font-bold uppercase tracking-widest pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
                  What you'll do
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
        </Carousel>

        {/* Floating back button — anchored to viewport top, above all slides */}
        <button
          onClick={() => navigate('/hunts')}
          className="absolute top-3 left-3 z-20 w-10 h-10 rounded-full bg-black/45 backdrop-blur text-white flex items-center justify-center tap-highlight active:scale-95 transition-transform"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          aria-label="Back to hunts"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </div>
        )}

        {/* Slide indicator pills (clickable) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {Array.from({ length: slideCount }).map((_, i) => {
            // map active index back to label index when map slide is hidden
            const labelIdx = huntPath.length > 0 ? i : (i === 0 ? 0 : 2);
            const isActive = activeSlide === i;
            return (
              <button
                key={i}
                onClick={() => carouselApi?.scrollTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-200 tap-highlight',
                  isActive ? 'w-7 bg-white shadow-md' : 'w-2 bg-white/55 hover:bg-white/85',
                )}
                aria-label={`Go to ${SLIDE_LABELS[labelIdx]} slide`}
              />
            );
          })}
        </div>
      </div>

      {/* Credits + CTA — fixed at bottom, scroll within their own region if long */}
      <div className="flex-1 flex flex-col">
        {hunt.credits && (
          <div className="px-5 pt-3">
            <p className="text-[11px] text-muted-foreground italic leading-snug">{hunt.credits}</p>
          </div>
        )}

        <div className="px-5 pt-3 pb-4 mt-auto sticky bottom-0 bg-background/95 backdrop-blur border-t" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
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
    </div>
  );
}
