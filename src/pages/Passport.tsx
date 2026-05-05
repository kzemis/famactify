// Passport — virtual stamp book for completed hunts, grouped by city.
// Printable layout for the fridge. Shows explorer progression tier.

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { badgesService } from '@/services/badgesService';
import { progressionService, TIER_THRESHOLDS, computeProgression } from '@/services/progressionService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import type { EarnedBadge, ExplorerProgression } from '@/types/hunt';

const TIER_COLORS: Record<string, string> = { gold: 'text-yellow-500', silver: 'text-gray-400', bronze: 'text-amber-700' };
const COUNTRY_FLAGS: Record<string, string> = { US: '🇺🇸', LV: '🇱🇻', DE: '🇩🇪', UK: '🇬🇧', FR: '🇫🇷' };

interface CityPage {
  city: string;
  countryCode: string;
  stamps: EarnedBadge[];
}

function groupByCity(badges: EarnedBadge[]): CityPage[] {
  const map = new Map<string, CityPage>();
  for (const b of badges) {
    const key = `${b.countryCode}-${b.city}`;
    if (!map.has(key)) map.set(key, { city: b.city, countryCode: b.countryCode, stamps: [] });
    map.get(key)!.stamps.push(b);
  }
  return Array.from(map.values()).sort((a, b) => a.countryCode.localeCompare(b.countryCode) || a.city.localeCompare(b.city));
}

export default function Passport() {
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [progression, setProgression] = useState<ExplorerProgression | null>(null);
  const [loading, setLoading] = useState(true);

  const profileId = currentProfile?.id ?? 'default';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      badgesService.listEarned(profileId),
      progressionService.getProgression(profileId),
    ]).then(([b, p]) => {
      setBadges(b);
      setProgression(p);
    }).finally(() => setLoading(false));
  }, [profileId]);

  const cities = groupByCity(badges);
  const tierInfo = progression ? TIER_THRESHOLDS.find(t => t.tier === progression.currentTier) : null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-background to-orange-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="tap-highlight"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">Explorer Passport</h1>
        <button onClick={() => window.print()} className="tap-highlight flex items-center gap-1 text-xs font-semibold text-primary px-3 py-1.5 rounded-full border border-primary/30 print:hidden">
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Cover */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-800 to-amber-950 text-white p-6 text-center shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==')]" />
          <p className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">Explorer Passport</p>
          <p className="text-3xl font-bold mb-1">{currentProfile?.name ?? 'Explorer'}</p>
          <p className="text-amber-300 text-sm">{badges.length} stamp{badges.length !== 1 ? 's' : ''} · {cities.length} cit{cities.length !== 1 ? 'ies' : 'y'}</p>
        </div>

        {/* Progression */}
        {progression && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{tierInfo?.emoji ?? '🌟'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{progression.currentTierLabel}</p>
                {progression.nextTierLabel && (
                  <p className="text-xs text-muted-foreground">{progression.huntsToNextTier} more hunt{progression.huntsToNextTier !== 1 ? 's' : ''} to {progression.nextTierLabel}</p>
                )}
              </div>
              <span className="text-lg font-bold text-primary">{progression.totalCompleted}</span>
            </div>
            {progression.nextTier && (
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary transition-all duration-500"
                  style={{ width: `${Math.max(4, progression.progressPct * 100)}%` }}
                />
              </div>
            )}
            {/* Tier milestones */}
            <div className="flex items-center justify-between gap-1">
              {TIER_THRESHOLDS.map(t => {
                const reached = progression.totalCompleted >= t.minHunts;
                return (
                  <div key={t.tier} className={cn('flex flex-col items-center gap-0.5', reached ? 'opacity-100' : 'opacity-40')}>
                    <span className="text-base">{t.emoji}</span>
                    <span className="text-[9px] font-medium leading-tight text-center">{t.label}</span>
                    <span className="text-[9px] text-muted-foreground">{t.minHunts}+</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* City pages */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : cities.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="font-semibold">No stamps yet</p>
            <p className="text-sm text-muted-foreground">Complete a scavenger hunt to earn your first stamp!</p>
          </div>
        ) : (
          cities.map(city => (
            <div key={`${city.countryCode}-${city.city}`} className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                <span className="text-lg">{COUNTRY_FLAGS[city.countryCode] ?? '🏳️'}</span>
                <span className="font-bold text-sm">{city.city}</span>
                <span className="ml-auto text-xs text-muted-foreground">{city.stamps.length} stamp{city.stamps.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-3 grid grid-cols-3 gap-3">
                {city.stamps.map(stamp => (
                  <button
                    key={stamp.huntId}
                    onClick={() => navigate(`/hunts/${stamp.huntSlug}`)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-muted/50 tap-highlight transition-colors"
                  >
                    <div className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-2xl border-[3px] shadow-md',
                      stamp.tier === 'gold' ? 'border-yellow-400 bg-yellow-50' :
                      stamp.tier === 'silver' ? 'border-gray-300 bg-gray-50' :
                      'border-amber-600 bg-amber-50'
                    )}>
                      {stamp.coverEmoji}
                    </div>
                    <p className="text-[10px] font-semibold leading-tight text-center line-clamp-2">{stamp.huntTitle}</p>
                    <div className="flex items-center gap-1">
                      <span className={cn('text-[10px] font-bold uppercase', TIER_COLORS[stamp.tier])}>{stamp.tier}</span>
                      <span className="text-[9px] text-muted-foreground">{Math.round(stamp.scorePct * 100)}%</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">{new Date(stamp.earnedAt).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block print:bg-white print:text-black p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Explorer Passport</h1>
        <p className="text-center text-lg mb-6">{currentProfile?.name ?? 'Explorer'} · {badges.length} stamps</p>
        {progression && (
          <p className="text-center text-sm mb-6 font-semibold">{tierInfo?.emoji} {progression.currentTierLabel} — {progression.totalCompleted} hunts completed</p>
        )}
        {cities.map(city => (
          <div key={`${city.countryCode}-${city.city}`} className="mb-6 break-inside-avoid">
            <h2 className="text-xl font-bold border-b pb-1 mb-3">
              {COUNTRY_FLAGS[city.countryCode] ?? '🏳️'} {city.city}
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {city.stamps.map(s => (
                <div key={s.huntId} className="text-center">
                  <div className="text-3xl mb-1">{s.coverEmoji}</div>
                  <p className="text-xs font-semibold">{s.huntTitle}</p>
                  <p className="text-xs text-gray-500">{s.tier} · {Math.round(s.scorePct * 100)}%</p>
                  <p className="text-xs text-gray-400">{new Date(s.earnedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-center text-xs text-gray-400 mt-8">famactify.app</p>
      </div>
    </div>
  );
}
