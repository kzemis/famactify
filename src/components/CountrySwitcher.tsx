import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCountry, COUNTRIES, type CountryCode } from "@/i18n/CountryContext";

const CountrySwitcher = () => {
  const { country, setCountry } = useCountry();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1 text-sm font-normal"
          aria-label="Select country"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {country.code}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {(Object.values(COUNTRIES) as typeof COUNTRIES[CountryCode][]).map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={country.code === c.code ? 'bg-accent font-medium' : ''}
          >
            <span className="mr-2 text-base">{c.flag}</span>
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CountrySwitcher;
