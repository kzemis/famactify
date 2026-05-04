import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Compass, LocateFixed, Navigation, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { huntsService } from '@/services/huntsService';

type ARClueOverlayProps = {
  target: {
    title: string;
    lat: number;
    lon: number;
    address?: string;
  };
  onClose: () => void;
};

type OrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDegrees(value: number): number {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function bearingDegrees(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const deltaLon = toRad(to.lon - from.lon);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return normalizeDegrees(toDeg(Math.atan2(y, x)));
}

export default function ARClueOverlay({ target, onClose }: ARClueOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const watchRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [orientationError, setOrientationError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [starting, setStarting] = useState(true);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setStarting(true);
      setCameraError(null);
      setLocationError(null);
      setOrientationError(null);

      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available in this browser');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error: any) {
        if (!cancelled) setCameraError(error?.message || 'Could not start camera');
      }

      try {
        if (!('geolocation' in navigator)) throw new Error('Location is not available in this browser');
        watchRef.current = navigator.geolocation.watchPosition(
          (pos) => setPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          (error) => setLocationError(error.message || 'Could not get location'),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
        );
      } catch (error: any) {
        if (!cancelled) setLocationError(error?.message || 'Could not start location');
      }

      try {
        const DeviceOrientation = DeviceOrientationEvent as any;
        if (typeof DeviceOrientation?.requestPermission === 'function') {
          const permission = await DeviceOrientation.requestPermission();
          if (permission !== 'granted') throw new Error('Compass permission was not granted');
        }
        const handleOrientation = (event: DeviceOrientationEvent) => {
          const compassEvent = event as OrientationEventWithCompass;
          if (typeof compassEvent.webkitCompassHeading === 'number') {
            setHeading(normalizeDegrees(compassEvent.webkitCompassHeading));
          } else if (typeof event.alpha === 'number') {
            setHeading(normalizeDegrees(360 - event.alpha));
          }
        };
        window.addEventListener('deviceorientation', handleOrientation, true);
        return () => window.removeEventListener('deviceorientation', handleOrientation, true);
      } catch (error: any) {
        if (!cancelled) setOrientationError(error?.message || 'Compass is not available');
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    let cleanupOrientation: (() => void) | undefined;
    start().then(cleanup => { cleanupOrientation = cleanup; }).catch(() => undefined);

    return () => {
      cancelled = true;
      cleanupOrientation?.();
      stopCamera();
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [stopCamera]);

  const navigation = useMemo(() => {
    if (!position) return null;
    const bearing = bearingDegrees(position, target);
    const distance = huntsService.distanceMeters(position, target);
    const delta = heading == null ? 0 : normalizeSignedDegrees(bearing - heading);
    return { bearing, distance, delta };
  }, [heading, position, target]);

  const directionHint = (() => {
    if (!navigation || heading == null) return 'Move around and point your phone — compass will wake up if supported.';
    const abs = Math.abs(navigation.delta);
    if (abs < 12) return 'Straight ahead';
    if (navigation.delta > 0) return abs > 90 ? 'Turn right a lot' : 'Turn right';
    return abs > 90 ? 'Turn left a lot' : 'Turn left';
  })();

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white">
      <video ref={videoRef} playsInline muted className={cn('absolute inset-0 w-full h-full object-cover', cameraError && 'hidden')} />
      {cameraError && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black flex flex-col items-center justify-center gap-3 text-center px-8">
          <Compass className="w-12 h-12 text-white/70" />
          <p className="font-bold">Camera unavailable</p>
          <p className="text-sm text-white/70">{cameraError}</p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/75 pointer-events-none" />

      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/45 backdrop-blur flex items-center justify-center tap-highlight"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        aria-label="Close AR guide"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="absolute left-4 right-16 top-4 space-y-1" style={{ top: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">AR clue guide</p>
        <h2 className="text-lg font-black leading-tight drop-shadow">{target.title}</h2>
        {target.address && <p className="text-xs text-white/75 line-clamp-1">{target.address}</p>}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-44 h-44 rounded-full border border-white/25 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="absolute inset-4 rounded-full border border-white/10" />
          <div
            className="transition-transform duration-300 ease-out"
            style={{ transform: `rotate(${navigation?.delta ?? 0}deg)` }}
          >
            <Navigation className="w-24 h-24 text-primary drop-shadow-[0_0_18px_rgba(236,72,153,0.9)] fill-primary/70" />
          </div>
        </div>
      </div>

      <div className="absolute left-4 right-4 bottom-5 rounded-3xl bg-black/55 backdrop-blur border border-white/15 p-4 space-y-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 18px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <LocateFixed className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{starting ? 'Starting sensors…' : directionHint}</p>
            <p className="text-xs text-white/70">
              {navigation ? `${Math.round(navigation.distance)}m away · bearing ${Math.round(navigation.bearing)}°` : 'Waiting for GPS location…'}
            </p>
          </div>
        </div>

        {(locationError || orientationError) && (
          <div className="rounded-2xl bg-amber-400/15 border border-amber-200/25 px-3 py-2 text-[11px] text-amber-50 space-y-1">
            {locationError && <p>GPS: {locationError}</p>}
            {orientationError && <p>Compass: {orientationError}</p>}
          </div>
        )}

        <button
          onClick={() => toast.info('Walk safely — the arrow is a helper, not a street-crossing instruction.')}
          className="w-full h-10 rounded-2xl bg-white/12 text-white text-xs font-semibold tap-highlight"
        >
          Safety check: keep eyes up and stay with a grown-up
        </button>
      </div>
    </div>
  );
}
