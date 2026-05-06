import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Clock, Users, Sparkles, Play, RotateCcw, CheckCircle2, Headphones, Zap, Smartphone } from 'lucide-react';
import MapView from '@/components/LazyMapView';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { huntsService, type HuntAttempt } from '@/services/huntsService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { flags } from '@/lib/flags';
import { cn } from '@/lib/utils';
import { useHunt } from '@/hooks/useHunt';

const SLIDE_LABEL: Record<string, string> = { about: 'About', map: 'Map', stops: 'Stops', credits: 'Sources' };

export default function HuntDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const profileId = currentProfile?.id ?? 'parent-default';

  const { data: hunt = null, isLoading: huntLoading } = useHunt(slug);
  const { data: latestAttempt = null, isLoading: attemptLoading } = useQuery<HuntAttempt | null>({
    queryKey: ['hunt-latest-attempt', hunt?.id ?? '', profileId],
    queryFn: () => huntsService.findLatestAttempt(hunt!.id, profileId),
    enabled: !!hunt?.id,
    staleTime: 30_000,
  });
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>(undefined);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mapSlideActivated, setMapSlideActivated] = useState(false);

  // Track active slide for indicator dots
  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => setActiveSlide(carouselApi.selectedScrollSnap());
    onSelect();
    carouselApi.on('select', onSelect);
    return () => { carouselApi.off('select', onSelect); };
  }, [carouselApi]);

  useEffect(() => {
    if (activeSlide >= 1) setMapSlideActivated(true);
  }, [activeSlide]);

  if (huntLoading || (!!hunt?.id && attemptLoading)) {
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
    .filter((s): s is typeof s & { lat: number; lon: number } => (
      typeof s.lat === 'number'
      && typeof s.lon === 'number'
      && Number.isFinite(s.lat)
      && Number.isFinite(s.lon)
      && !(Math.abs(s.lat) < 0.0001 && Math.abs(s.lon) < 0.0001)
    ))
    .map((s, i) => ({
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      name: `${i + 1}. ${s.title}`,
    }));

  const hours = Math.round(hunt.durationMinutes / 60 * 10) / 10;
  // Build ordered slide keys so indicator dots + count stay in sync
  const slideKeys = [
    'about',
    ...(huntPath.length > 0 ? ['map'] : []),
    'stops',
    ...(hunt.credits ? ['credits'] : []),
  ] as const;
  const slideCount = slideKeys.length;
  const shouldMountMap = mapSlideActivated || activeSlide >= 1;

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
                  {shouldMountMap ? (
                    <MapView places={[]} path={huntPath} className="absolute inset-0" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <MapPin className="w-8 h-8" />
                      <p className="text-sm font-semibold">Swipe here to load the route map</p>
                    </div>
                  )}
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

            {/* Slide 4: Sources / Credits (only when present) */}
            {hunt.credits && (
              <CarouselItem className="pl-0 basis-full">
                <div className="relative w-full aspect-[4/5] sm:aspect-[16/10] bg-gradient-to-br from-slate-50 via-background to-sky-50/40 overflow-hidden">
                  <div className="absolute inset-0 overflow-y-auto px-5 pt-14 pb-10 no-scrollbar flex flex-col gap-3">
                    <div className="rounded-2xl border bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Source facts &amp; credits</p>
                      <p className="text-sm text-foreground/80 leading-relaxed">{hunt.credits}</p>
                    </div>
                  </div>
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/90 backdrop-blur shadow-md border text-[11px] font-bold uppercase tracking-widest pointer-events-none" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
                    Sources
                  </div>
                </div>
              </CarouselItem>
            )}
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
          {slideKeys.map((key, i) => {
            const isActive = activeSlide === i;
            return (
              <button
                key={key}
                onClick={() => carouselApi?.scrollTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all duration-200 tap-highlight',
                  isActive ? 'w-7 bg-white shadow-md' : 'w-2 bg-white/55 hover:bg-white/85',
                )}
                aria-label={`Go to ${SLIDE_LABEL[key]} slide`}
              />
            );
          })}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex-1 flex flex-col">
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
          {flags.scv_duo_mode && (
            <button
              onClick={() => navigate(`/duo/host/${hunt.slug}`)}
              className="w-full mt-2 h-11 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-800 font-semibold text-sm flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-transform"
            >
              <Smartphone className="w-4 h-4" /> Play with kid on a second phone
            </button>
          )}
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
