import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, Users } from 'lucide-react';
import { huntsService, type ScavengerHunt } from '@/services/huntsService';
import { useCountry } from '@/i18n/CountryContext';

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
};

export default function Hunts() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const [hunts, setHunts] = useState<ScavengerHunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    huntsService.listHunts({ countryCode: country.code }).then(list => {
      setHunts(list);
      setLoading(false);
    });
  }, [country.code]);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl">🔍</span>
          <h1 className="text-lg font-bold">Scavenger Hunts</h1>
          <span className="text-xs text-muted-foreground">· {hunts.length}</span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-tab-bar space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : hunts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="font-semibold">No hunts here yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Hunts are place-based mini-adventures designed by venues and museums. We'll add some near you soon.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Place-based mini-adventures: clue → location → answer. Explore real places through playful challenges.
            </p>
            {hunts.map(h => (
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
                  <span className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${DIFFICULTY_COLOR[h.difficulty]}`}>
                    {DIFFICULTY_LABEL[h.difficulty]}
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
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{h.stops.length} stops</span>
                    <span>·</span>
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
