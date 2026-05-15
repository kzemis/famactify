// MP-T2: Thin redirector — joins a session by code (from QR or manual entry),
// then navigates to /play/:sessionId/lobby.
// Route: /play/join?code=ABCDEF

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService } from '@/services/sessionService';
import { toast } from 'sonner';

export default function PlayLobbyJoin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If code provided in URL, attempt join immediately
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.length === 6) {
      handleJoin(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(joinCode: string) {
    const clean = joinCode.toUpperCase().trim();
    if (clean.length !== 6) { setError('Enter a 6-character code'); return; }
    setLoading(true);
    setError(null);
    try {
      const session = await sessionService.getSessionByCode(clean);
      if (!session) { setError('Code not found — check and try again'); setLoading(false); return; }

      // Join the session with a placeholder identity (lobby lets user update it)
      await sessionService.joinSession(session.id, {
        displayName: 'Player',
        avatarEmoji: '🦊',
        role: 'solver',
      });

      navigate(`/play/${session.id}/lobby`, { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Could not join session');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 gap-6">
      <span className="text-5xl">🎮</span>
      <h1 className="text-2xl font-black text-center">Join a city game</h1>
      <p className="text-sm text-muted-foreground text-center">Enter the 6-letter code your host shared</p>

      <div className="w-full max-w-xs space-y-3">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABCDEF"
          maxLength={6}
          className="w-full h-14 rounded-2xl border-2 border-border px-4 text-center text-2xl font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <button
          onClick={() => handleJoin(code)}
          disabled={loading || code.length !== 6}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
        >
          {loading ? 'Joining…' : 'Join game'}
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full h-11 rounded-2xl border border-border text-sm font-medium"
        >
          Back
        </button>
      </div>
    </div>
  );
}
