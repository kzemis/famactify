// MP-T2: Unified play lobby
// Route: /play/:sessionId/lobby
// Supports solo, duo, race presets in this sprint. Team builder (kids_vs_parents etc.) in MP-T5.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, Play, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sessionService } from '@/services/sessionService';
import { supabase } from '@/integrations/supabase/client';
import PlayerIdentityCard from '@/components/PlayerIdentityCard';
import ParticipantAvatar from '@/components/ParticipantAvatar';
import type { HuntSession, SessionTeam, SessionParticipant } from '@/types/session';
import { useHunt } from '@/hooks/useHunt';

const PRESET_LABELS: Record<string, string> = {
  solo: 'Solo',
  duo: 'Duo',
  race: 'Race',
  kids_vs_parents: 'Kids vs Parents',
  family_squads: 'Family Squads',
  mixed: 'Mixed',
  custom: 'Custom',
};

function PresetChip({ teamMode, roleConfig }: { teamMode: string; roleConfig: string }) {
  let label = 'Solo';
  let bg = 'bg-slate-100 text-slate-700';
  if (teamMode === 'team_collab') { label = 'Duo'; bg = 'bg-amber-100 text-amber-800'; }
  if (teamMode === 'team_vs_team') { label = 'Race'; bg = 'bg-rose-100 text-rose-700'; }
  if (roleConfig === 'guide_and_solver' && teamMode === 'team_collab') { label = 'Duo (guide + solver)'; }
  return (
    <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide', bg)}>
      {label}
    </span>
  );
}

export default function PlayLobby() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<HuntSession | null>(null);
  const [teams, setTeams] = useState<SessionTeam[]>([]);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [me, setMe] = useState<SessionParticipant | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Identity state (for the lobby identity card)
  const [myName, setMyName] = useState('');
  const [myEmoji, setMyEmoji] = useState('🦊');
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
  const identityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load hunt for cover
  const { data: hunt = null } = useHunt(session?.huntId ?? null);

  // ── Initial load ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const [sess, teamList, participantList, myParticipant] = await Promise.all([
          sessionService.getSession(sessionId),
          sessionService.listTeams(sessionId),
          sessionService.listParticipants(sessionId),
          sessionService.getMyParticipant(sessionId),
        ]);
        if (cancelled) return;

        setSession(sess);
        setTeams(teamList);
        setParticipants(participantList);
        if (myParticipant) {
          setMe(myParticipant);
          setMyName(myParticipant.displayName);
          setMyEmoji(myParticipant.avatarEmoji);
          setMyAvatarUrl(myParticipant.avatarUrl);
        }

        // If session already started, go directly to play
        if (sess?.status === 'playing') navigate(`/play/${sessionId}/play`, { replace: true });
        if (sess?.status === 'finished') navigate(`/play/${sessionId}/results`, { replace: true });
      } catch {
        toast.error('Could not load lobby');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId, navigate]);

  // ── Realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    const unsub = sessionService.subscribe(sessionId, {
      onSessionChange: (s) => {
        setSession(s);
        if (s.status === 'playing') navigate(`/play/${sessionId}/play`, { replace: true });
        if (s.status === 'finished') navigate(`/play/${sessionId}/results`, { replace: true });
      },
      onTeamsChange: setTeams,
      onParticipantsChange: (ps) => {
        setParticipants(ps);
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            const mine = ps.find(p => p.userId === data.user!.id);
            if (mine) setMe(mine);
          }
        });
      },
    });
    return unsub;
  }, [sessionId, navigate]);

  // ── Identity debounce update ──────────────────────────────────────────
  const handleNameChange = useCallback((val: string) => {
    setMyName(val);
    if (identityDebounceRef.current) clearTimeout(identityDebounceRef.current);
    identityDebounceRef.current = setTimeout(async () => {
      if (!me) return;
      try { await sessionService.updateMyIdentity(me.id, { displayName: val }); } catch { /* silent */ }
    }, 500);
  }, [me]);

  const handleEmojiChange = useCallback(async (emoji: string) => {
    setMyEmoji(emoji);
    if (!me) return;
    try { await sessionService.updateMyIdentity(me.id, { avatarEmoji: emoji }); } catch { /* silent */ }
  }, [me]);

  const handleAvatarUrlChange = useCallback(async (url: string | null) => {
    setMyAvatarUrl(url);
    if (!me) return;
    try { await sessionService.updateMyIdentity(me.id, { avatarUrl: url }); } catch { /* silent */ }
  }, [me]);

  // ── Determine if I'm the host ─────────────────────────────────────────
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUserId(data.user?.id ?? null));
  }, []);
  const isHost = session?.createdBy === authUserId;

  // ── Start button gate ─────────────────────────────────────────────────
  function canStart(): boolean {
    if (!session) return false;
    if (session.teamMode === 'solo') return participants.length >= 1;
    if (session.teamMode === 'team_collab') return participants.length >= 2;
    if (session.teamMode === 'team_vs_team') return teams.length >= 2;
    return participants.length >= 1;
  }

  async function handleStart() {
    if (!sessionId || !session) return;
    setStarting(true);
    try {
      await sessionService.startSession(sessionId);
      navigate(`/play/${sessionId}/play`, { replace: true });
    } catch (err: any) {
      toast.error(err.message ?? 'Could not start game');
      setStarting(false);
    }
  }

  // ── Copy join code ────────────────────────────────────────────────────
  function copyCode() {
    if (!session) return;
    navigator.clipboard.writeText(session.joinCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  // ── Grouped participants by team ──────────────────────────────────────
  function participantsForTeam(teamId: string) {
    return participants.filter(p => p.teamId === teamId);
  }

  const joinUrl = session
    ? `${window.location.origin}/play/join?code=${session.joinCode}`
    : '';
  const isSolo = session?.teamMode === 'solo';

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl">😕</span>
        <p className="font-semibold">Session not found</p>
        <button onClick={() => navigate('/hunts')} className="h-11 px-6 rounded-full bg-primary text-primary-foreground font-medium text-sm">
          Back to city games
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-8" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
      {/* ── Cover strip ─────────────────────────────────────────────── */}
      <div className="relative w-full h-40 bg-gradient-to-br from-primary/30 via-pink-200 to-amber-200 overflow-hidden shrink-0">
        {hunt?.coverImage ? (
          <img src={hunt.coverImage} alt={hunt.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : hunt?.coverEmoji ? (
          <div className="absolute inset-0 flex items-center justify-center text-7xl">{hunt.coverEmoji}</div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/75">City game · Lobby</p>
              <p className="text-lg font-black text-white truncate">{hunt?.title ?? 'Loading…'}</p>
            </div>
            <PresetChip teamMode={session.teamMode} roleConfig={session.roleConfig} />
          </div>
        </div>
        <button
          onClick={() => navigate('/hunts')}
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center"
          style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
          aria-label="Back"
        >
          ←
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* ── Identity card ──────────────────────────────────────────── */}
        {me && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Your identity</p>
            <PlayerIdentityCard
              name={myName}
              onNameChange={handleNameChange}
              avatarEmoji={myEmoji}
              onAvatarEmojiChange={handleEmojiChange}
              avatarUrl={myAvatarUrl}
              onAvatarUrlChange={handleAvatarUrlChange}
              nameLabel="Your name"
              namePlaceholder="Enter your name"
            />
          </div>
        )}

        {/* ── Join code + QR (non-solo only) ─────────────────────────── */}
        {!isSolo && (
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Invite link</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-3xl font-black tracking-[0.15em] text-center py-2 bg-muted/40 rounded-xl">
                  {session.joinCode}
                </p>
              </div>
              <button
                onClick={copyCode}
                className={cn(
                  'shrink-0 h-12 px-4 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-colors',
                  codeCopied ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground',
                )}
              >
                {codeCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-center pt-1">
              <div className="p-2 bg-white rounded-xl shadow-sm border">
                <QRCodeSVG
                  value={joinUrl}
                  size={120}
                  fgColor="#000000"
                  bgColor="#ffffff"
                  level="M"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Scan QR or share code — other players go to <strong>famactify.app/play/join</strong>
            </p>
          </div>
        )}

        {/* ── Participant list grouped by team ───────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {isSolo ? 'Players' : `Players (${participants.length})`}
          </p>
          <div className="space-y-3">
            {teams.map(team => (
              <div key={team.id} className="rounded-2xl border bg-card overflow-hidden">
                {!isSolo && (
                  <div className="px-3 py-2 bg-muted/40 border-b flex items-center gap-2">
                    <span className="text-base">{team.emoji}</span>
                    <p className="font-semibold text-sm flex-1">{team.name}</p>
                  </div>
                )}
                <div className="divide-y">
                  {participantsForTeam(team.id).map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                      <ParticipantAvatar
                        p={{ id: p.id, familyEmoji: p.avatarEmoji, avatarUrl: p.avatarUrl, familyName: p.displayName } as any}
                        size={32}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{p.displayName}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{p.role}</p>
                      </div>
                      {p.userId === session.createdBy && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Host</span>
                      )}
                    </div>
                  ))}
                  {participantsForTeam(team.id).length === 0 && (
                    <div className="px-3 py-3 text-xs text-muted-foreground italic">Waiting for players…</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Status hint ────────────────────────────────────────────── */}
        {!isSolo && !isHost && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            ⏳ Waiting for the host to start the game…
          </div>
        )}
      </div>

      {/* ── Start button (host only) ───────────────────────────────── */}
      {isHost && (
        <div className="px-4 pt-3 shrink-0 border-t bg-background/95 backdrop-blur">
          <button
            onClick={handleStart}
            disabled={starting || !canStart()}
            className={cn(
              'w-full h-12 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 tap-highlight active:scale-[0.98] transition-all',
              canStart()
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {starting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
            ) : (
              <><Play className="w-4 h-4" /> Start game</>
            )}
          </button>
          {!canStart() && !isSolo && (
            <p className="text-[11px] text-muted-foreground text-center mt-1.5">
              {session.teamMode === 'team_vs_team'
                ? 'Need at least 2 teams to start'
                : 'Need at least 2 players to start'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
