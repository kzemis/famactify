import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCountry, COUNTRIES, type CountryCode } from '@/i18n/CountryContext';
import { cn } from '@/lib/utils';

interface RegionPillProps {
  compact?: boolean;
  className?: string;
}

export default function RegionPill({ compact = false, className }: RegionPillProps) {
  const { country, setCountry } = useCountry();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-9 rounded-full bg-muted/80 hover:bg-muted border border-border/50 px-3 flex items-center gap-1.5 text-xs font-semibold tap-highlight active:scale-95 transition-transform shrink-0',
            className,
          )}
          aria-label="Change region"
        >
          <span className="text-base leading-none">{country.flag}</span>
          {compact ? (
            <span>{country.code}</span>
          ) : (
            <>
              <span className="text-muted-foreground">Region:</span>
              <span>{country.name}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[190px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Show places in
        </DropdownMenuLabel>
        {(Object.values(COUNTRIES) as typeof COUNTRIES[CountryCode][]).map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={country.code === c.code ? 'bg-accent font-medium' : ''}
          >
            <span className="mr-2 text-base">{c.flag}</span>
            {c.name}
            {country.code === c.code && <span className="ml-auto text-xs text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
