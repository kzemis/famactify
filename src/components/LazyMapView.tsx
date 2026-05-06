import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import type { MapViewProps } from '@/components/MapView';

const MapView = lazy(() => import('@/components/MapView'));

export default function LazyMapView(props: MapViewProps) {
  return (
    <Suspense
      fallback={
        <div className={cn('min-h-[240px] bg-muted flex items-center justify-center', props.className)}>
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <MapView {...props} />
    </Suspense>
  );
}
