import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import { useCountry } from '@/i18n/CountryContext';
import RegionPill from '@/components/RegionPill';

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-rose-100 text-rose-700',
};

/**
 * /play — focused list of FamActify-curated citygames.
 * Filtered to host_name = 'FamActify Original' (see huntsService.listCitygames).
 * Visual style mirrors /hunts so the two surfaces feel consistent.
 */
export default function Play() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['citygames', country.code],
    queryFn: () => huntsService.listCitygames({ countryCode: country.code, limit: 24 }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-[100dvh] bg-background">

      {/* Top bar */}
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}
      >
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-2xl">🗺️</span>
            <h1 className="text-lg font-bold truncate">Citygames</h1>
            <span className="text-xs text-muted-foreground">· {games.length}</span>
          </div>
          <RegionPill compact />
        </div>
      </div>

      <div className="px-4 pt-4 pb-tab-bar space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="font-semibold">No citygames here yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Citygames are place-based mini-adventures — clue → place → action → story. We'll add some near you soon.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Showing {country.name}. Place-based mini-adventures: clue → place → action → story.
            </p>
            {games.map(h => (
              <button
                key={h.id}
                onClick={() => navigate(`/hunts/${h.slug}`)}
                className="w-full text-left rounded-3xl border bg-card overflow-hidden shadow-sm tap-highlight active:scale-[0.99] transition-transform"
              >
                {/* Cover */}
                <div className="relative h-36 bg-gradient-to-br from-primary/20 via-pink-100 to-amber-100 flex items-center justify-center overflow-hidden">
                  {h.coverImage ? (
                    <img
                      src={h.coverImage}
                      alt={h.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-6xl drop-shadow-sm">{h.coverEmoji}</span>
                  )}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${DIFFICULTY_COLOR[h.difficulty] ?? 'bg-muted text-muted-foreground'}`}>
                    {DIFFICULTY_LABEL[h.difficulty] ?? h.difficulty}
                  </span>
                </div>
                {/* Body */}
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="font-bold text-base leading-tight">{h.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">by {h.hostName} · {h.city}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{h.blurb}</p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
                    {h.stops.length > 0 && (
                      <>
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{h.stops.length} steps</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />~{Math.round(h.durationMinutes / 60 * 10) / 10}h</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />ages {h.ageMin}–{h.ageMax}</span>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
