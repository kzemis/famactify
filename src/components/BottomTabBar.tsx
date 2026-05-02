import { useNavigate, useLocation } from 'react-router-dom';
import { Compass, BookMarked, Sparkles, User, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function BottomTabBar() {
  const navigate  = useNavigate();
  const { pathname, search } = useLocation();
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

  const isActive = (id: string) => {
    if (id === 'discover') return pathname === '/activities' && !search.includes('view=plan');
    if (id === 'plan')     return pathname === '/plan' || (pathname === '/activities' && search.includes('view=plan'));
    if (id === 'saved')    return pathname === '/saved-trips';
    if (id === 'kids')     return pathname === '/kids';
    if (id === 'me')       return pathname === '/profile';
    return false;
  };

  const TABS = [
    { id: 'discover', label: 'Discover',  icon: Compass,      onTap: () => navigate('/activities')          },
    { id: 'plan',     label: 'Plan',       icon: CalendarDays,  onTap: () => navigate('/activities?view=plan') },
    { id: 'saved',    label: 'Saved',      icon: BookMarked,    onTap: () => navigate('/saved-trips')         },
    { id: 'kids',     label: 'Kid Mode',   icon: Sparkles,      onTap: () => navigate('/kids')                },
    { id: 'me',       label: 'Me',         icon: User,          onTap: () => navigate('/profile')             },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {TABS.map(({ id, label, icon: Icon, onTap }) => {
          const active = isActive(id);
          const isKids = id === 'kids';
          return (
            <button
              key={id}
              onClick={onTap}
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
