import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCountry, COUNTRIES, type CountryCode } from "@/i18n/CountryContext";

/**
 * Merged region + language picker — one icon, one dropdown.
 * Shows the active country flag as the trigger so the user always sees
 * their current region at a glance.
 */
const LocaleSwitcher = () => {
  const { language, setLanguage } = useLanguage();
  const { country, setCountry } = useCountry();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Region & language"
        >
          {/* Show flag when a country is set, otherwise globe */}
          {country?.flag
            ? <span className="text-lg leading-none">{country.flag}</span>
            : <Globe className="h-4 w-4" />
          }
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[180px]">
        {/* ── Region ── */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Region
        </DropdownMenuLabel>
        {(Object.values(COUNTRIES) as typeof COUNTRIES[CountryCode][]).map((c) => (
          <DropdownMenuItem
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={country.code === c.code ? "bg-accent font-medium" : ""}
          >
            <span className="mr-2 text-base">{c.flag}</span>
            {c.name}
            {country.code === c.code && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* ── Language ── */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
          Language
        </DropdownMenuLabel>
        {[
          { code: "en", label: "English",   flag: "🇬🇧" },
          { code: "lv", label: "Latviešu",  flag: "🇱🇻" },
        ].map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as "en" | "lv")}
            className={language === lang.code ? "bg-accent font-medium" : ""}
          >
            <span className="mr-2 text-base">{lang.flag}</span>
            {lang.label}
            {language === lang.code && (
              <span className="ml-auto text-xs text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LocaleSwitcher;
