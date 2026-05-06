// Passport — virtual stamp book for completed hunts, grouped by city.
// Printable layout for the fridge. Shows explorer progression tier.

import { useEffect, useState } from 'react';
import { ArrowLeft, Printer, Trophy, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { badgesService } from '@/services/badgesService';
import { progressionService, TIER_THRESHOLDS, computeProgression } from '@/services/progressionService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import type { EarnedBadge, BadgeTier, ExplorerProgression } from '@/types/hunt';

// ── Stamp ink colours by tier ─────────────────────────────────────────────────
const STAMP_STYLE: Record<BadgeTier, { outer: string; inner: string; emoji: string; label: string }> = {
  gold:   { outer: 'border-yellow-500',   inner: 'bg-yellow-50  text-yellow-700',  emoji: '⭐', label: 'Gold'   },
  silver: { outer: 'border-indigo-400',   inner: 'bg-indigo-50  text-indigo-700',  emoji: '🌙', label: 'Silver' },
  bronze: { outer: 'border-emerald-500',  inner: 'bg-emerald-50 text-emerald-700', emoji: '🌿', label: 'Bronze' },
};

// Fixed small rotations so each stamp looks naturally hand-stamped
const ROTATIONS = [-3, 2, -4, 3, -1, 4, -2, 1, -3.5, 2.5];

const COUNTRY_FLAGS: Record<string, string> = { US: '🇺🇸', LV: '🇱🇻', DE: '🇩🇪', UK: '🇬🇧', FR: '🇫🇷', SE: '🇸🇪', FI: '🇫🇮', EE: '🇪🇪' };
const COUNTRY_NAMES: Record<string, string> = { US: 'United States', LV: 'Latvia', DE: 'Germany', UK: 'United Kingdom', FR: 'France', SE: 'Sweden', FI: 'Finland', EE: 'Estonia' };

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
  return Array.from(map.values()).sort((a, b) =>
    a.countryCode.localeCompare(b.countryCode) || a.city.localeCompare(b.city),
  );
}

// ── Rubber-stamp component ────────────────────────────────────────────────────
function Stamp({ badge, idx, onClick }: { badge: EarnedBadge; idx: number; onClick: () => void }) {
  const style = STAMP_STYLE[badge.tier];
  const rot   = ROTATIONS[idx % ROTATIONS.length];
  const date  = new Date(badge.earnedAt)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 tap-highlight group"
      style={{ transform: `rotate(${rot}deg)` }}
      aria-label={`${badge.huntTitle} stamp`}
    >
      {/* Outer ring */}
      <div className={cn(
        'relative w-[84px] h-[84px] rounded-full',
        'border-[3px] border-double',
        'flex items-center justify-center',
        'shadow-md group-active:scale-95 transition-transform',
        style.outer,
      )}>
        {/* Inner disc */}
        <div className={cn(
          'w-[68px] h-[68px] rounded-full flex flex-col items-center justify-center gap-0.5 px-1',
          style.inner,
        )}>
          <span className="text-[28px] leading-none">{badge.coverEmoji}</span>
          <span className="text-[7px] font-bold uppercase tracking-tight text-center leading-tight line-clamp-2 w-full px-1">
            {badge.huntTitle}
          </span>
          <span className="text-[6.5px] font-mono opacity-70 leading-none">{date}</span>
        </div>
        {/* Rim sparkle for gold tier */}
        {badge.tier === 'gold' && (
          <span className="absolute -top-1 -right-1 text-[10px] leading-none">✨</span>
        )}
      </div>
    </button>
  );
}

// ── City page (like a visa page) ─────────────────────────────────────────────
function CityPage({ city, index }: { city: CityPage; index: number }) {
  const navigate = useNavigate();
  const flag   = COUNTRY_FLAGS[city.countryCode] ?? '🏳️';
  const bgHue  = index % 2 === 0 ? 'from-amber-50/60 to-orange-50/40' : 'from-sky-50/60 to-blue-50/40';

  return (
    <section className={cn(
      'rounded-3xl overflow-hidden border bg-gradient-to-br relative',
      bgHue,
    )}>
      {/* Faint watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[120px] opacity-[0.04] rotate-[-20deg]">{flag}</span>
      </div>

      {/* City header */}
      <div className="relative px-5 pt-4 pb-2 border-b border-border/40 flex items-center gap-2">
        <span className="text-2xl">{flag}</span>
        <div className="flex-1">
          <p className="font-black text-base leading-tight">{city.city}</p>
          <p className="text-[11px] text-muted-foreground">{COUNTRY_NAMES[city.countryCode] ?? city.countryCode}</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          {city.stamps.length} stamp{city.stamps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Stamp grid */}
      <div className="relative px-4 py-5 flex flex-wrap gap-x-3 gap-y-5 justify-start">
        {city.stamps.map((s, i) => (
          <Stamp
            key={s.huntId}
            badge={s}
            idx={i}
            onClick={() => navigate(`/hunts/${s.huntSlug}`)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Progression bar + tier row ────────────────────────────────────────────────
function ProgressionCard({ progression }: { progression: ExplorerProgression }) {
  const tierInfo = TIER_THRESHOLDS.find(t => t.tier === progression.currentTier);

  return (
    <div className="rounded-3xl border bg-card shadow-sm p-4 space-y-3">
      {/* Tier headline */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{tierInfo?.emoji ?? '🧭'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">{progression.currentTierLabel}</p>
          {progression.nextTierLabel ? (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {progression.huntsToNextTier} more hunt{progression.huntsToNextTier !== 1 ? 's' : ''} to reach{' '}
              <span className="font-semibold text-primary">{progression.nextTierLabel}</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">Maximum tier reached 🏆</p>
          )}
        </div>
        <span className="text-2xl font-black text-primary">{progression.totalCompleted}</span>
      </div>

      {/* Progress bar */}
      {progression.nextTier && (
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${Math.max(4, progression.progressPct * 100)}%` }}
          />
        </div>
      )}

      {/* Milestone row */}
      <div className="flex items-center justify-between">
        {TIER_THRESHOLDS.map(t => {
          const reached = progression.totalCompleted >= t.minHunts;
          const isCurrent = t.tier === progression.currentTier;
          return (
            <div key={t.tier} className={cn('flex flex-col items-center gap-0.5 flex-1', !reached && 'opacity-35')}>
              <span className={cn('text-xl transition-transform', isCurrent && 'scale-125')}>{t.emoji}</span>
              <span className="text-[8px] font-bold text-center leading-tight">{t.label.split(' ')[0]}</span>
              <span className="text-[8px] text-muted-foreground">{t.minHunts}+</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function BlankPassport() {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl border-2 border-dashed border-border/60 bg-card/60 py-12 px-6 flex flex-col items-center text-center gap-3">
      <BookOpen className="w-10 h-10 text-muted-foreground/50" />
      <p className="font-bold text-base">Your passport is empty</p>
      <p className="text-sm text-muted-foreground max-w-[240px] leading-snug">
        Complete a scavenger hunt to earn your first stamp and start filling up your passport!
      </p>
      <button
        onClick={() => navigate('/hunts')}
        className="mt-1 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight"
      >
        Browse hunts
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Passport() {
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();
  const [badges, setBadges]         = useState<EarnedBadge[]>([]);
  const [progression, setProgression] = useState<ExplorerProgression | null>(null);
  const [loading, setLoading]       = useState(true);

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

  return (
    <>
      {/* ── Screen view ────────────────────────────────────────────────────── */}
      <div className="min-h-[100dvh] bg-gradient-to-b from-amber-50/70 via-background to-background pb-32 print:hidden">
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
        >
          <button onClick={() => navigate(-1)} className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black flex-1">Explorer Passport</h1>
          <button
            onClick={() => window.print()}
            className="tap-highlight flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 rounded-full border border-primary/40"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Passport cover */}
          <div className="rounded-3xl overflow-hidden shadow-xl relative">
            {/* Navy cover */}
            <div className="bg-gradient-to-br from-[#1a2744] via-[#1e3160] to-[#16213a] px-6 py-7 text-center relative overflow-hidden">
              {/* Embossed pattern overlay */}
              <div className="absolute inset-0 opacity-[0.06] bg-[repeating-linear-gradient(45deg,white_0px,white_1px,transparent_1px,transparent_12px)]" />
              {/* Gold line accents */}
              <div className="absolute top-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

              <p className="relative text-[9px] uppercase tracking-[0.35em] text-yellow-300/80 mb-1 font-semibold">Explorer Passport</p>
              <p className="relative text-[10px] uppercase tracking-[0.2em] text-white/50 mb-4 font-light">FamActify</p>
              <div className="relative w-16 h-16 mx-auto rounded-full bg-yellow-400/15 border-2 border-yellow-400/40 flex items-center justify-center mb-4 shadow-inner">
                <span className="text-[36px] leading-none">🧭</span>
              </div>
              <p className="relative text-xl font-black text-white tracking-wide">{currentProfile?.name ?? 'Explorer'}</p>
              <p className="relative text-xs text-yellow-300/70 mt-0.5">
                {badges.length} stamp{badges.length !== 1 ? 's' : ''} · {cities.length} cit{cities.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
          </div>

          {/* Progression */}
          {progression && <ProgressionCard progression={progression} />}

          {/* City pages / loading / empty */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : cities.length === 0 ? (
            <BlankPassport />
          ) : (
            cities.map((city, i) => (
              <CityPage key={`${city.countryCode}-${city.city}`} city={city} index={i} />
            ))
          )}
        </div>
      </div>

      {/* ── Print layout ───────────────────────────────────────────────────── */}
      {/* Only rendered when user hits Print; completely hidden on screen     */}
      <div className="hidden print:block print:bg-white print:text-black font-sans">
        {/* Cover header */}
        <div className="border-b-4 border-black pb-4 mb-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Explorer Passport · FamActify</p>
          <h1 className="text-3xl font-black">{currentProfile?.name ?? 'Explorer'}</h1>
          {progression && (
            <p className="text-sm font-semibold text-gray-600 mt-1">
              {TIER_THRESHOLDS.find(t => t.tier === progression.currentTier)?.emoji ?? '🧭'}{' '}
              {progression.currentTierLabel} · {progression.totalCompleted} hunt{progression.totalCompleted !== 1 ? 's' : ''} completed
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{badges.length} stamps · {cities.length} cities</p>
        </div>

        {/* Stamp pages by city */}
        {cities.map(city => (
          <div key={`print-${city.countryCode}-${city.city}`} className="mb-8 break-inside-avoid">
            <h2 className="text-base font-black border-b border-gray-300 pb-1 mb-4 flex items-center gap-2">
              <span>{COUNTRY_FLAGS[city.countryCode] ?? '🏳️'}</span>
              <span>{city.city}</span>
              <span className="text-gray-400 font-normal text-xs ml-auto">{COUNTRY_NAMES[city.countryCode] ?? city.countryCode}</span>
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {city.stamps.map(s => {
                const style = STAMP_STYLE[s.tier];
                const date  = new Date(s.earnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase();
                return (
                  <div key={`print-stamp-${s.huntId}`} className="flex flex-col items-center gap-1">
                    {/* Stamp ring */}
                    <div className={cn(
                      'w-[72px] h-[72px] rounded-full border-[2.5px] border-double flex flex-col items-center justify-center gap-0.5',
                      style.outer, style.inner,
                    )}>
                      <span className="text-[22px] leading-none">{s.coverEmoji}</span>
                      <span className="text-[6px] font-bold uppercase tracking-tight text-center leading-tight px-1 line-clamp-2">
                        {s.huntTitle}
                      </span>
                      <span className="text-[5.5px] font-mono opacity-60">{date}</span>
                    </div>
                    <p className="text-[8px] font-semibold text-center leading-tight max-w-[72px]">{s.huntTitle}</p>
                    <p className="text-[7px] text-gray-400">{style.label} · {Math.round(s.scorePct * 100)}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty slots — blank stamps for future adventures */}
        {(() => {
          const totalFilled = badges.length;
          const nextGrid    = Math.ceil((totalFilled + 1) / 4) * 4; // next full row
          const blanks      = Math.min(nextGrid - totalFilled, 8);
          if (blanks === 0) return null;
          return (
            <div className="mb-8 break-inside-avoid">
              <h2 className="text-base font-black border-b border-gray-300 pb-1 mb-4 text-gray-300">
                Coming soon…
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: blanks }).map((_, i) => (
                  <div key={`blank-${i}`} className="flex flex-col items-center gap-1">
                    <div className="w-[72px] h-[72px] rounded-full border-[2px] border-dashed border-gray-200 flex items-center justify-center">
                      <span className="text-[10px] text-gray-200 font-bold">?</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <p className="text-center text-[9px] text-gray-300 mt-8 border-t border-gray-100 pt-3">
          famactify.app · printed {new Date().toLocaleDateString()}
        </p>
      </div>
    </>
  );
}
