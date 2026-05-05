import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminPageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  onBack?: () => void;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function AdminPageShell({
  eyebrow = 'Admin',
  title,
  subtitle,
  backTo,
  onBack,
  actions,
  filters,
  children,
  contentClassName,
}: AdminPageShellProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => backTo && navigate(backTo));

  return (
    <div className="min-h-[100dvh] bg-background pb-tab-bar">
      <div
        className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 flex items-center gap-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: 12, minHeight: 56 }}
      >
        {(backTo || onBack) && (
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {eyebrow && <p className="text-xs font-semibold text-muted-foreground truncate">{eyebrow}</p>}
          <p className="text-sm font-bold truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {filters}

      <main className={cn('px-4 pt-2 space-y-3', contentClassName)}>
        {children}
      </main>
    </div>
  );
}

export function adminPillClass(active: boolean) {
  return cn(
    'h-8 px-3 rounded-full text-xs font-medium shrink-0 tap-highlight transition-colors',
    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
  );
}

export function adminActionClass(variant: 'primary' | 'secondary' = 'secondary') {
  return cn(
    'h-9 px-3 rounded-full text-xs font-semibold tap-highlight flex items-center gap-1.5 disabled:opacity-50',
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : 'border border-border bg-background hover:bg-muted',
  );
}
