import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScavengerHunt } from '@/types/hunt';

const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard:   'bg-rose-100 text-rose-700',
};
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

interface CitygameCardProps {
  hunt: ScavengerHunt;
  /** rail = fixed-width horizontal card; grid = fills grid cell */
  variant?: 'rail' | 'grid';
}

export default function CitygameCard({ hunt, variant = 'grid' }: CitygameCardProps) {
  const navigate = useNavigate();
  const isRail = variant === 'rail';

  return (
    <button
      onClick={() => navigate(`/hunts/${hunt.slug}`)}
      className={cn(
        'text-left rounded-2xl border bg-card overflow-hidden shadow-sm',
        'active:scale-[0.98] transition-transform tap-highlight',
        isRail ? 'w-52 flex-shrink-0 snap-start' : 'w-full',
      )}
    >
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-primary/20 via-pink-100 to-amber-100 flex items-center justify-center overflow-hidden">
        {hunt.coverImage ? (
          <img
            src={hunt.coverImage}
            alt={hunt.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl drop-shadow-sm">{hunt.coverEmoji}</span>
        )}
        <span className={cn(
          'absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shadow-sm',
          DIFFICULTY_COLOR[hunt.difficulty] ?? 'bg-muted text-muted-foreground',
        )}>
          {DIFFICULTY_LABEL[hunt.difficulty] ?? hunt.difficulty}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-1">
        <p className="text-[10px] font-medium text-primary uppercase tracking-wide">{hunt.city}</p>
        <h3 className="font-bold text-sm leading-tight line-clamp-2">{hunt.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-0.5 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            ~{Math.round(hunt.durationMinutes / 60 * 10) / 10}h
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" />
            {hunt.ageMin}–{hunt.ageMax}
          </span>
          {hunt.stops.length > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {hunt.stops.length} stops
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
