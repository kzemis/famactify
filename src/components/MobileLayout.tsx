import { type ReactNode } from 'react';
import BottomTabBar from './BottomTabBar';

interface MobileLayoutProps {
  children: ReactNode;
  /** Pass true to hide tab bar (auth, onboarding, detail-only screens) */
  hideTabBar?: boolean;
}

export default function MobileLayout({ children, hideTabBar = false }: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Content area — bottom padding leaves room for tab bar */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: hideTabBar ? 'env(safe-area-inset-bottom)' : 'calc(env(safe-area-inset-bottom) + 64px)' }}
      >
        {children}
      </main>
      {!hideTabBar && <BottomTabBar />}
    </div>
  );
}
