import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, BookMarked, Sparkles, User, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const TABS = [
  { label: 'Discover', icon: Compass,      route: '/activities'  },
  { label: 'Plan',     icon: CalendarDays,  route: '/plan'        },
  { label: 'Saved',    icon: BookMarked,    route: '/saved-trips' },
  { label: 'Kids',     icon: Sparkles,      route: '/kids'        },
  { label: 'Me',       icon: User,          route: '/profile'     },
] as const;

export default function BottomTabBar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [kidBadge, setKidBadge] = useState(0);

  useEffect(() => {
    const read = () => {
      const proposals = JSON.parse(localStorage.getItem('famactify-kid-proposals') || '[]');
      setKidBadge(proposals.filter((p: any) => p.status === 'pending').length);
    };
    read();
    window.addEventListener('storage', read);
    return () => window.removeEventListener('storage', read);
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {TABS.map(({ label, icon: Icon, route }) => {
          const active = pathname === route || (route !== '/activities' && pathname.startsWith(route));
          const isKids = route === '/kids';
          return (
            <button
              key={route}
              onClick={() => navigate(route)}
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
                {isKids && kidBadge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                    {kidBadge}
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
