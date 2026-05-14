import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import CitygameCard from '@/components/CitygameCard';

/** Skeleton card for loading state */
function SkeletonCard() {
  return (
    <div className="w-52 flex-shrink-0 snap-start rounded-2xl bg-muted animate-pulse overflow-hidden">
      <div className="h-28 bg-muted-foreground/10" />
      <div className="p-3 space-y-2">
        <div className="h-2 w-10 rounded bg-muted-foreground/20" />
        <div className="h-3 w-40 rounded bg-muted-foreground/20" />
        <div className="h-2 w-24 rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

/**
 * Horizontal-scroll rail showing FamActify citygames.
 * Renders nothing when empty (don't show an empty rail).
 */
export default function CitygamesRail() {
  const navigate = useNavigate();
  const { data: games, isLoading } = useQuery({
    queryKey: ['citygames-rail'],
    queryFn: () => huntsService.listCitygames(8),
    staleTime: 5 * 60_000,
  });

  // Don't render anything while loading has finished and there are no citygames
  if (!isLoading && (!games || games.length === 0)) return null;

  return (
    <section className="my-4">
      {/* Section header */}
      <div className="flex items-end justify-between mb-2 px-4">
        <div>
          <h2 className="text-base font-semibold leading-tight">Citygames near you</h2>
          <p className="text-xs text-muted-foreground">Play your way through a place</p>
        </div>
        <button
          onClick={() => navigate('/play')}
          className="flex items-center gap-0.5 text-xs text-primary font-medium min-h-[44px] px-1"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-none">
        {isLoading
          ? [0, 1, 2].map(i => <SkeletonCard key={i} />)
          : games!.map(g => <CitygameCard key={g.id} hunt={g} variant="rail" />)
        }
      </div>
    </section>
  );
}
