// DuoLobby — entry point for two-phone parent+kid mode.
// Two flows in one page:
//   1. Host (parent) at /duo/host/:slug — creates session, shows QR + join code,
//      waits for kid to scan/type the code, then taps "Start playing".
//   2. Join (kid) at /duo/join — kid types/scans the code and enters identity,
//      then is taken straight into the synced play screen.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users, Sparkles, Copy, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { huntsService } from '@/services/huntsService';
import { raceService } from '@/services/raceService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { supabase } from '@/integrations/supabase/client';
import type { HuntRace, RaceParticipant, ScavengerHunt } from '@/types/hunt';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pickRandomAvatar } from '@/lib/avatars';
import PlayerIdentityCard from '@/components/PlayerIdentityCard';
import ParticipantAvatar from '@/components/ParticipantAvatar';

type Mode = 'host' | 'join';

export default function DuoLobby() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();

  // Detect mode by URL: /duo/host/:slug = host, /duo/join = join
  const mode: Mode = slug ? 'host' : 'join';

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [session, setSession] = useState<HuntRace | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Host identity state ────────────────────────────────────────────────────
  const [hostName, setHostName] = useState(currentProfile?.name ?? 'Parent');
  const [hostAvatarEmoji, setHostAvatarEmoji] = useState(() => pickRandomAvatar());
  const [hostAvatarUrl, setHostAvatarUrl] = useState<string | null>(null);
  const identityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Join identity state ────────────────────────────────────────────────────
  const joinCodeParam = searchParams.get('code') ?? '';
  const [joinCode, setJoinCode] = useState(joinCodeParam.toUpperCase());
  const [joinName, setJoinName] = useState(currentProfile?.name ?? 'Kid');
  const [joinAvatarEmoji, setJoinAvatarEmoji] = useState(() => pickRandomAvatar());
  const [joinAvatarUrl, setJoinAvatarUrl] = useState<string | null>(null);

  // ── HOST FLOW ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'host' || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const h = await huntsService.getHunt(slug);
        if (!h) {
          toast.error('City game not found');
          navigate('/hunts');
          return;
        }
        if (cancelled) return;
        setHunt(h);

        // Create the session and auto-join as parent_guide with defaults
        const newSession = await raceService.createDuoSession(h.id);
        const defaultName = currentProfile?.name ?? 'Parent';
        const defaultEmoji = pickRandomAvatar();
        const p = await raceService.joinSession(
          newSession.id,
          defaultName,
          defaultEmoji,
          h.stops.length,
          'parent_guide',
        );
        if (cancelled) return;
        setSession(newSession);
        setMyParticipantId(p.id);
        // Sync identity state with what was stored
        setHostName(defaultName);
        setHostAvatarEmoji(defaultEmoji);

        // Initial participants fetch
        const initial = await raceService.getParticipants(newSession.id);
        if (cancelled) return;
        setParticipants(initial);
      } catch (e: any) {
        console.error('[DuoLobby host]', e);
        toast.error(e?.message ?? 'Could not create session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, slug]);

  // Push identity changes to DB with 500ms debounce (host flow)
  useEffect(() => {
    if (!myParticipantId) return;
    if (identityDebounce.current) clearTimeout(identityDebounce.current);
    identityDebounce.current = setTimeout(async () => {
      try {
        await raceService.updateParticipantIdentity({
          participantId: myParticipantId,
          familyName: hostName,
          familyEmoji: hostAvatarEmoji,
          avatarUrl: hostAvatarUrl,
        });
      } catch (e: any) {
        console.warn('[DuoLobby] identity update failed', e?.message);
      }
    }, 500);
    return () => { if (identityDebounce.current) clearTimeout(identityDebounce.current); };
  }, [myParticipantId, hostName, hostAvatarEmoji, hostAvatarUrl]);

  // Realtime subscription on participants — host watches for kid joining
  useEffect(() => {
    if (mode !== 'host' || !session) return;
    const channel = supabase
      .channel(`duo-lobby-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hunt_race_participants',
        filter: `race_id=eq.${session.id}`,
      }, async () => {
        const list = await raceService.getParticipants(session.id);
        setParticipants(list);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [mode, session?.id]);

  // ── JOIN FLOW ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'join') setLoading(false);
    else setLoading(false);
  }, [mode]);

  const handleJoin = async () => {
    const code = joinCode.toUpperCase().trim();
    if (code.length < 4) { toast.error('Enter the 6-character code'); return; }
    if (!joinName.trim()) { toast.error('Enter your name'); return; }
    setWorking(true);
    try {
      const race = await raceService.getRaceByCode(code);
      if (!race) { toast.error('Code not found'); return; }
      if (race.mode !== 'duo') {
        toast.error('That code is for a race, not a duo session');
        navigate('/race/join');
        return;
      }
      const huntRow = await huntsService.getHuntById(race.huntId).catch(() => null);
      const totalStops = huntRow?.stops.length ?? 0;
      await raceService.joinSession(
        race.id,
        joinName.trim() || 'Kid',
        joinAvatarEmoji,
        totalStops,
        'kid_solver',
        joinAvatarUrl,
      );
      navigate(`/duo/${race.id}/play`);
    } catch (e: any) {
      console.error('[DuoLobby join]', e);
      toast.error(e?.message ?? 'Could not join');
    } finally {
      setWorking(false);
    }
  };

  const handleStart = () => {
    if (!session) return;
    navigate(`/duo/${session.id}/play`);
  };

  const handleCopyCode = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const kidJoined = participants.some(p => p.role === 'kid_solver');

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Join screen (kid types code) ──
  if (mode === 'join') {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-primary/5 via-background to-background pb-tab-bar">
        <div
          className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
        >
          <button onClick={() => navigate(-1)} className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-black flex-1">Join family city game</h1>
        </div>

        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-black">Join the game</h2>
            <p className="text-sm text-muted-foreground leading-snug max-w-sm mx-auto">
              Enter the code from the other phone, pick your look, then join.
            </p>
          </div>

          {/* Code input */}
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD23"
            maxLength={6}
            autoFocus={!joinCodeParam}
            className="w-full h-16 text-center text-3xl font-black tracking-[0.4em] uppercase rounded-2xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />

          {/* Identity card */}
          <PlayerIdentityCard
            name={joinName}
            onNameChange={setJoinName}
            avatarEmoji={joinAvatarEmoji}
            onAvatarEmojiChange={setJoinAvatarEmoji}
            avatarUrl={joinAvatarUrl}
            onAvatarUrlChange={setJoinAvatarUrl}
            nameLabel="Your name"
            namePlaceholder="e.g. Maya"
          />

          <button
            onClick={handleJoin}
            disabled={working || joinCode.length < 4 || !joinName.trim()}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold tap-highlight active:scale-[0.99] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {working ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {working ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    );
  }

  // ── Host screen (parent shares code) ──
  if (!hunt || !session) return null;

  const joinUrl = `${window.location.origin}/duo/join?code=${session.joinCode}`;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/5 via-background to-background pb-tab-bar">
      <div
        className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
      >
        <button onClick={() => navigate(`/hunts/${hunt.slug}`)} className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black flex-1 truncate">Two-phone city game</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Hunt cover */}
        <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 p-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              {hunt.coverImage ? <img src={hunt.coverImage} alt="" className="w-full h-full object-cover" /> : <span>{hunt.coverEmoji}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight truncate">{hunt.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{hunt.stops.length} steps · {hunt.city}</p>
            </div>
          </div>
        </div>

        {/* Your identity */}
        <PlayerIdentityCard
          name={hostName}
          onNameChange={setHostName}
          avatarEmoji={hostAvatarEmoji}
          onAvatarEmojiChange={setHostAvatarEmoji}
          avatarUrl={hostAvatarUrl}
          onAvatarUrlChange={setHostAvatarUrl}
          nameLabel="Your name"
          namePlaceholder="e.g. Alex"
        />

        {/* Big join code + QR */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/30 p-6 text-center space-y-3 shadow-md">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary/80">Kid's join code</p>
          <p className="text-5xl font-black tracking-[0.3em] text-primary">{session.joinCode}</p>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-full bg-background border text-xs font-semibold text-primary tap-highlight"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>

          {/* QR code */}
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">Or scan to join</p>
            <div className="bg-white p-3 rounded-2xl inline-block shadow-sm">
              <QRCodeSVG
                value={joinUrl}
                size={160}
                level="M"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>
        </div>

        {/* How it works card */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">How two-phone mode works</p>
              <ol className="text-[13px] text-muted-foreground leading-snug mt-2 space-y-1.5 list-decimal pl-4">
                <li>Kid scans the QR code (or types the code) on their phone</li>
                <li>Kid enters their name + picks an avatar</li>
                <li>You read the clue out loud. Kid solves it.</li>
                <li>You see the answer on your phone — you decide when to advance.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Live participant list */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Players</p>
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Waiting…</p>
          ) : (
            participants.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <ParticipantAvatar p={p} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{p.familyName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.role === 'parent_guide' ? 'Guide (you)' : p.role === 'kid_solver' ? 'Solver' : 'Player'}
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            ))
          )}
          {!kidJoined && (
            <p className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for other player to join…
            </p>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!kidJoined}
          className={cn(
            'w-full h-14 rounded-2xl font-bold tap-highlight active:scale-[0.99] transition-all flex items-center justify-center gap-2',
            kidJoined
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          <Sparkles className="w-4 h-4" />
          {kidJoined ? 'Start playing!' : 'Waiting for other player…'}
        </button>

        <p className="text-[11px] text-center text-muted-foreground leading-snug">
          You can also start solo and let them join later — just keep this code handy.
        </p>
      </div>
    </div>
  );
}
