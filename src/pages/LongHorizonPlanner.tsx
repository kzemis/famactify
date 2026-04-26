import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Minus, Plus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: 'Sport',     emoji: '🏃' },
  { name: 'Education', emoji: '📚' },
  { name: 'Culture',   emoji: '🎭' },
  { name: 'Nature',    emoji: '🌿' },
  { name: 'Social',    emoji: '👫' },
  { name: 'Fun',       emoji: '🎉' },
] as const;

const AVG_DURATION_MIN = 90; // assumed average duration per activity

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CategoryName = typeof CATEGORIES[number]['name'];
type QuotaMap = Record<CategoryName, number>;

interface HorizonPlan {
  year: number;
  month: number; // 0-indexed
  quotas: QuotaMap;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMonthOptions(): Array<{ label: string; year: number; month: number }> {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return options;
}

function storageKey(year: number, month: number): string {
  return `famactify-horizon-${year}-${month}`;
}

function emptyQuotas(): QuotaMap {
  return Object.fromEntries(CATEGORIES.map(c => [c.name, 0])) as QuotaMap;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LongHorizonPlanner() {
  const monthOptions = buildMonthOptions();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [quotas, setQuotas] = useState<QuotaMap>(emptyQuotas());

  const selected = monthOptions[selectedIdx];

  // Load from localStorage on month change
  useEffect(() => {
    const key = storageKey(selected.year, selected.month);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const plan: HorizonPlan = JSON.parse(raw);
        setQuotas({ ...emptyQuotas(), ...plan.quotas });
      } else {
        setQuotas(emptyQuotas());
      }
    } catch {
      setQuotas(emptyQuotas());
    }
  }, [selected.year, selected.month]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const totalActivities = Object.values(quotas).reduce((a, b) => a + b, 0);
  const totalMinutes = totalActivities * AVG_DURATION_MIN;
  const totalHours = Math.round(totalMinutes / 60);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const adjust = (cat: CategoryName, delta: number) => {
    setQuotas(prev => ({
      ...prev,
      [cat]: Math.max(0, (prev[cat] ?? 0) + delta),
    }));
  };

  const handleSave = () => {
    const key = storageKey(selected.year, selected.month);
    const plan: HorizonPlan = { year: selected.year, month: selected.month, quotas };
    localStorage.setItem(key, JSON.stringify(plan));
    toast.success(`Plan saved for ${selected.label}`);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Monthly Plan</h1>
            <p className="text-muted-foreground mt-1">
              Set activity targets for the coming month
            </p>
          </div>
          {/* Month picker */}
          <select
            value={selectedIdx}
            onChange={e => setSelectedIdx(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {monthOptions.map((opt, i) => (
              <option key={i} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Category quota builder */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Activity targets for {selected.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CATEGORIES.map(({ name, emoji }) => (
              <div key={name} className="flex items-center gap-4">
                {/* Category label */}
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <span className="text-xl">{emoji}</span>
                  <span className="font-medium text-sm">{name}</span>
                </div>

                {/* Counter */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjust(name, -1)}
                    disabled={quotas[name] === 0}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                    aria-label={`Decrease ${name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-semibold tabular-nums">
                    {quotas[name]}
                  </span>
                  <button
                    onClick={() => adjust(name, 1)}
                    className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={`Increase ${name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Find activities link */}
                <Link
                  to={`/community?category=${name}`}
                  className="ml-auto text-xs text-primary hover:underline shrink-0"
                >
                  Find activities →
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Summary bar */}
        <div className="rounded-lg border bg-muted/40 px-5 py-4 flex flex-wrap gap-6 mb-6 text-sm">
          <div>
            <span className="text-muted-foreground">Total planned</span>
            <p className="text-2xl font-bold">{totalActivities}</p>
            <p className="text-xs text-muted-foreground">activities</p>
          </div>
          <div>
            <span className="text-muted-foreground">Est. total time</span>
            <p className="text-2xl font-bold">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">at ~{AVG_DURATION_MIN}min avg</p>
          </div>
        </div>

        {/* Save button */}
        <Button onClick={handleSave} className="w-full gap-2" size="lg">
          <Save className="w-4 h-4" />
          Save plan for {selected.label}
        </Button>
      </main>

      <Footer />
    </div>
  );
}
