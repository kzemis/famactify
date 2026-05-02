import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, ChevronLeft, ArrowRight, RotateCcw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MoodFilters {
  categories?: string[];
  indoor?: boolean;
  rainSuitable?: boolean;
  duration?: 'any' | '<60' | '60-120' | '120-240' | '240+';
  maxPrice?: string;
  ages?: string[];
}

interface StepOption {
  label: string;
  emoji: string;
  filters: Partial<MoodFilters>;
}

interface Step {
  id: string;
  question: string;
  subtitle: string;
  multi?: boolean; // allow multi-select (not used currently but ready)
  options: StepOption[];
}

interface MoodSuggestProps {
  matchCount: number;
  loading: boolean;
  /** Called after every answer — parent applies these filters immediately */
  onFilterChange: (filters: MoodFilters) => void;
  /** User taps "Show results" — parent switches to grid view */
  onShowResults: () => void;
  /** Parent clears all filters and resets mood state */
  onReset: () => void;
  /** Ages derived from family profile — silently pre-applied */
  familyAges?: string[];
}

// ── Steps definition ──────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'vibe',
    question: "What's the vibe today?",
    subtitle: 'Pick the energy that matches your mood',
    options: [
      { label: 'Nature & Fresh Air',   emoji: '🌿', filters: { categories: ['Nature'] } },
      { label: 'Creative & Cultural',  emoji: '🎨', filters: { categories: ['Culture', 'Education'] } },
      { label: 'Pure Fun',             emoji: '🎉', filters: { categories: ['Fun'] } },
      { label: 'Get Active',           emoji: '🏃', filters: { categories: ['Sport'] } },
      { label: 'Learn Something New',  emoji: '🔬', filters: { categories: ['Education'] } },
      { label: 'Social Hangout',       emoji: '🤝', filters: { categories: ['Social'] } },
      { label: 'Any vibe',             emoji: '🌈', filters: { categories: [] } },
    ],
  },
  {
    id: 'setting',
    question: 'Indoor or outdoor?',
    subtitle: "Weather, vibes — what's the situation",
    options: [
      { label: 'Outdoors all the way', emoji: '☀️',  filters: { indoor: false } },
      { label: 'Keep us inside',       emoji: '🏠',  filters: { indoor: true } },
      { label: 'Rain? Still going!',   emoji: '🌧️', filters: { rainSuitable: true, indoor: false } },
      { label: 'Any setting',          emoji: '🤷',  filters: { indoor: undefined, rainSuitable: undefined } as any },
    ],
  },
  {
    id: 'duration',
    question: 'How long do you have?',
    subtitle: "We'll match activities to your schedule",
    options: [
      { label: 'Quick trip  (<1h)',  emoji: '⚡', filters: { duration: '<60' } },
      { label: '1–2 hours',         emoji: '🕐', filters: { duration: '60-120' } },
      { label: 'Half day  (2–4h)',   emoji: '🌅', filters: { duration: '120-240' } },
      { label: 'Full day  (4h+)',    emoji: '🌞', filters: { duration: '240+' } },
      { label: 'Any duration',       emoji: '🌈', filters: { duration: 'any' } },
    ],
  },
  {
    id: 'budget',
    question: "What's the budget?",
    subtitle: 'No judgment — just better matches',
    options: [
      { label: 'Free is perfect',   emoji: '💚', filters: { maxPrice: 'free' } },
      { label: 'Small spend is ok', emoji: '💛', filters: { maxPrice: '20' } },
      { label: 'Open to anything',  emoji: '✨', filters: { maxPrice: 'any' } },
      { label: 'Any budget',        emoji: '🌈', filters: { maxPrice: 'any' } },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function CountBadge({ count, loading }: { count: number; loading: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all',
      loading
        ? 'bg-muted text-muted-foreground animate-pulse'
        : count > 0
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-orange-100 text-orange-700',
    )}>
      {loading ? (
        <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Searching…</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5" />{count} {count === 1 ? 'activity' : 'activities'} match</>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MoodSuggest({
  matchCount,
  loading,
  onFilterChange,
  onShowResults,
  onReset,
  familyAges = [],
}: MoodSuggestProps) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(Array(STEPS.length).fill(null));
  // accumulated filters across all answered steps
  const [accumulated, setAccumulated] = useState<MoodFilters>({ ages: familyAges });
  // animate step transitions
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // if family ages arrive late (after profile load), seed them once
  useEffect(() => {
    if (familyAges.length > 0) {
      setAccumulated(prev => ({ ...prev, ages: familyAges }));
      onFilterChange({ ...accumulated, ages: familyAges });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyAges.join(',')]);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const answeredCount = selected.filter(s => s !== null).length;

  const goTo = (nextStep: number, dir: 'forward' | 'back') => {
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 180);
  };

  const pickOption = (optionIndex: number) => {
    const option = currentStep.options[optionIndex];
    const newSelected = [...selected];
    newSelected[step] = optionIndex;
    setSelected(newSelected);

    // Merge this step's filters into accumulated
    const next: MoodFilters = { ...accumulated, ...option.filters };
    setAccumulated(next);
    onFilterChange(next);

    // Auto-advance after short delay; on the last step, auto-show results
    setTimeout(() => {
      if (!isLast) {
        goTo(step + 1, 'forward');
      } else {
        onShowResults();
      }
    }, 260);
  };

  const skipStep = () => {
    const newSelected = [...selected];
    newSelected[step] = -1; // -1 = skipped
    setSelected(newSelected);
    if (!isLast) goTo(step + 1, 'forward');
    else onShowResults();
  };

  const goBack = () => {
    if (step === 0) { onReset(); return; }
    goTo(step - 1, 'back');
  };

  const handleReset = () => {
    setStep(0);
    setSelected(Array(STEPS.length).fill(null));
    setAccumulated({ ages: familyAges });
    onReset();
  };

  return (
    <div className="flex flex-col min-h-[calc(100dvh-120px)] px-4 pt-2 pb-tab-bar">

      {/* ── Top navigation ── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goBack}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted tap-highlight active:scale-90 transition-transform"
          aria-label={step === 0 ? 'Exit mood mode' : 'Back'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-full transition-all duration-300',
                i === step
                  ? 'w-5 h-2 bg-primary'
                  : selected[i] !== null
                    ? 'w-2 h-2 bg-primary/60'
                    : 'w-2 h-2 bg-muted',
              )}
            />
          ))}
        </div>

        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted tap-highlight active:scale-90 transition-transform"
          aria-label="Start over"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* ── Question ── */}
      <div
        key={step}
        className={cn(
          'transition-all duration-180',
          animating
            ? direction === 'forward'
              ? 'opacity-0 translate-x-4'
              : 'opacity-0 -translate-x-4'
            : 'opacity-100 translate-x-0',
        )}
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-2xl font-bold leading-tight mb-1">{currentStep.question}</h2>
          <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
        </div>

        {/* ── Options grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {currentStep.options.map((opt, i) => {
            const isSelected = selected[step] === i;
            return (
              <button
                key={i}
                onClick={() => pickOption(i)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 min-h-[100px]',
                  'tap-highlight active:scale-[0.96] transition-all duration-150',
                  isSelected
                    ? 'border-primary bg-primary/8 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40',
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    ✓
                  </span>
                )}
                <span className="text-3xl leading-none">{opt.emoji}</span>
                <span className={cn(
                  'text-xs font-semibold text-center leading-tight',
                  isSelected ? 'text-primary' : 'text-foreground',
                )}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Skip link */}
        <div className="mt-3 flex justify-center">
          <button
            onClick={skipStep}
            className="text-xs text-muted-foreground tap-highlight px-3 py-2 rounded-full hover:text-foreground transition-colors"
          >
            Skip this question →
          </button>
        </div>
      </div>

      {/* Spacer pushes footer to bottom */}
      <div className="flex-1" />

      {/* ── Bottom: match counter + show results ── */}
      <div className="space-y-3 pt-4 pb-2">
        {/* Live match counter */}
        <div className="flex justify-center">
          <CountBadge count={matchCount} loading={loading} />
        </div>

        {/* Show results — visible from step 2 onward (or when all answered) */}
        {(answeredCount >= 2 || isLast) && (
          <button
            onClick={onShowResults}
            disabled={loading || matchCount === 0}
            className={cn(
              'w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base',
              'tap-highlight active:scale-[0.98] transition-transform shadow-sm',
              matchCount > 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />Finding matches…</>
            ) : matchCount > 0 ? (
              <>Show {matchCount} {matchCount === 1 ? 'activity' : 'activities'} <ArrowRight className="w-5 h-5" /></>
            ) : (
              'No matches — try different options'
            )}
          </button>
        )}

        {/* Family ages notice */}
        {familyAges.length > 0 && step === 0 && (
          <p className="text-center text-[11px] text-muted-foreground">
            🧒 Using your family profile · ages {familyAges.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
