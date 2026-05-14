import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Footprints, Award, Trophy, Users, ArrowLeft } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import CitygameCard from '@/components/CitygameCard';

const OTHER_MODES = [
  { to: '/hunts',     icon: Footprints, label: 'All Hunts',  description: 'Browse the full catalog' },
  { to: '/chores',    icon: Award,      label: 'Home Chores', description: 'Parent-built home hunts' },
  { to: '/passport',  icon: Trophy,     label: 'Passport',    description: 'Track completed games' },
  { to: '/race/join', icon: Users,      label: 'Race',        description: 'Multi-family live race' },
];

export default function Play() {
  const navigate = useNavigate();
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['citygames'],
    queryFn: () => huntsService.listCitygames(24),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-20">

      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/40 px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-2xl">🗺️</span>
          <h1 className="text-lg font-bold truncate">Play</h1>
        </div>
      </div>

      {/* Hero blurb */}
      <div className="px-4 pt-5 pb-1">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Place-based games and adventures for families. Go somewhere, discover something, make a memory.
        </p>
      </div>

      {/* ── Citygames grid ── */}
      <section className="px-4 pt-4">
        <h2 className="text-base font-semibold mb-3">Citygames</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse overflow-hidden">
                <div className="h-28 bg-muted-foreground/10" />
                <div className="p-3 space-y-2">
                  <div className="h-2 w-10 rounded bg-muted-foreground/20" />
                  <div className="h-3 w-full rounded bg-muted-foreground/20" />
                  <div className="h-2 w-20 rounded bg-muted-foreground/15" />
                </div>
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <span className="text-4xl">🗺️</span>
            <p className="font-semibold text-sm">No citygames yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Citygames are coming to your city soon. Check back or browse all hunts below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {games.map(g => (
              <CitygameCard key={g.id} hunt={g} variant="grid" />
            ))}
          </div>
        )}
      </section>

      {/* ── Other play modes rail ── */}
      <section className="px-4 mt-8">
        <h2 className="text-base font-semibold mb-3">More play modes</h2>
        <div className="grid grid-cols-2 gap-3">
          {OTHER_MODES.map(({ to, icon: Icon, label, description }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col items-start gap-1.5 p-4 rounded-xl border border-border/60 bg-card hover:bg-muted active:scale-[0.98] transition-all text-left min-h-[44px]"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold leading-tight">{label}</span>
              <span className="text-xs text-muted-foreground leading-snug">{description}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
