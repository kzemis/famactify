import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, BookMarked, Sparkles, User, CalendarDays, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { countUniqueActionableKidProposals } from '@/lib/kidProposals';
import { useAuthGate } from '@/hooks/use-auth-gate';

export default function BottomTabBar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { mode } = useFamilyMode();
  const { gateOrNavigate, isAuthenticated } = useAuthGate();
  const [kidBadge, setKidBadge] = useState(0);

  useEffect(() => {
    const read = () => {
      setKidBadge(countUniqueActionableKidProposals(mode));
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, [mode]);

  const isActive = (id: string) => {
    if (id === 'discover') return pathname === '/activities' && !search.includes('view=plan');
    if (id === 'plan')     return pathname === '/plan' || (pathname === '/activities' && search.includes('view=plan'));
    if (id === 'saved')    return pathname === '/saved-trips';
    if (id === 'kids')     return pathname === '/kids';
    if (id === 'me')       return pathname === '/profile';
    return false;
  };

  // A `gated: true` flag drives both the lock icon and the gateOrNavigate routing.
  // The reason string is what the user sees in the AuthGate drawer headline:
  // "Sign in to save your trips" / "Sign in to see your profile"
  const TABS = [
    { id: 'discover', label: 'Activities', icon: Compass,      gated: false, reason: '',                 to: '/activities'           },
    { id: 'plan',     label: 'Plan',        icon: CalendarDays, gated: false, reason: '',                 to: '/activities?view=plan' },
    { id: 'saved',    label: 'Trips',       icon: BookMarked,   gated: true,  reason: 'save your trips',  to: '/saved-trips'          },
    { id: 'kids',     label: 'Mode',        icon: Sparkles,     gated: false, reason: '',                 to: '/kids'                 },
    { id: 'me',       label: 'Me',          icon: User,         gated: true,  reason: 'see your profile', to: '/profile'              },
  ] as const;

  const handleTap = (tab: typeof TABS[number]) => {
    if (tab.gated) {
      gateOrNavigate({ to: tab.to, reason: tab.reason });
    } else {
      navigate(tab.to);
    }
  };

  // Show lock only when we know the user is anonymous. `null` (loading) = no lock yet.
  const showLockFor = (gated: boolean) => gated && isAuthenticated === false;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const { id, label, icon: Icon, gated } = tab;
          const active = isActive(id);
          const showBadge = id === 'plan';
          return (
            <button
              key={id}
              onClick={() => handleTap(tab)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 relative',
                'active:scale-90 transition-transform duration-100',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className="relative">
                <Icon
                  className={cn('w-5 h-5', active && 'fill-primary stroke-primary')}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {showBadge && kidBadge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {kidBadge}
                  </span>
                )}
                {showLockFor(gated) && (
                  <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-muted border border-background flex items-center justify-center">
                    <Lock className="h-2 w-2 text-muted-foreground" strokeWidth={2.5} />
                  </span>
                )}
              </span>
              <span className={cn('text-[10px] font-medium leading-none', active ? 'text-primary' : 'text-muted-foreground')}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
