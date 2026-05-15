// MP-T2: Thin redirector — creates a session for the given hunt slug + preset,
// then navigates to /play/:sessionId/lobby.
// Route: /play/host/:slug?preset=solo|duo|race|...

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';
import { huntsService } from '@/services/huntsService';
import { toast } from 'sonner';
import type { SessionPreset } from '@/types/session';

export default function PlayLobbyHost() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setError('Missing hunt slug'); return; }

    const preset = (searchParams.get('preset') ?? 'solo') as SessionPreset;

    let cancelled = false;
    (async () => {
      try {
        // Resolve slug → hunt ID
        const hunt = await huntsService.getHunt(slug);
        if (!hunt) throw new Error('City game not found');
        if (cancelled) return;

        const session = await sessionService.createSession(hunt.id, preset);
        if (cancelled) return;

        navigate(`/play/${session.id}/lobby`, { replace: true });
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Could not create session');
      }
    })();

    return () => { cancelled = true; };
  }, [slug, navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">😕</span>
        <p className="font-semibold text-destructive">{error}</p>
        <button
          onClick={() => navigate('/hunts')}
          className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm"
        >
          Back to city games
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}
