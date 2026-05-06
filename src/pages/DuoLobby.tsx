// DuoLobby — entry point for two-phone parent+kid mode.
// Two flows in one page:
//   1. Host (parent) at /duo/host/:slug — creates session, shares join code,
//      waits for kid to scan/type the code, then taps "Start playing".
//   2. Join (kid) at /duo/join — kid types the code and is taken straight
//      into the synced play screen.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Sparkles, Copy, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { huntsService } from '@/services/huntsService';
import { raceService } from '@/services/raceService';
import { useFamilyMode } from '@/contexts/FamilyModeContext';
import { supabase } from '@/integrations/supabase/client';
import type { HuntRace, RaceParticipant, ScavengerHunt } from '@/types/hunt';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Mode = 'host' | 'join';

export default function DuoLobby() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { currentProfile } = useFamilyMode();

  // Detect mode by URL: /duo/host/:slug = host, /duo/join = join
  const mode: Mode = slug ? 'host' : 'join';

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [session, setSession] = useState<HuntRace | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  // ── HOST FLOW ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'host' || !slug) return;
    let cancelled = false;
    (async () => {
      try {
        const h = await huntsService.getHunt(slug);
        if (!h) {
          toast.error('Hunt not found');
          navigate('/hunts');
          return;
        }
        if (cancelled) return;
        setHunt(h);

        // Create the session and join as parent_guide
        const newSession = await raceService.createDuoSession(h.id);
        const familyName = currentProfile?.name ?? 'Parent';
        await raceService.joinSession(
          newSession.id,
          familyName,
          '👨‍👩‍👧',
          h.stops.length,
          'parent_guide',
        );
        if (cancelled) return;
        setSession(newSession);

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
  }, [mode, slug, navigate, currentProfile?.name]);

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
    setWorking(true);
    try {
      const race = await raceService.getRaceByCode(code);
      if (!race) { toast.error('Code not found'); return; }
      if (race.mode !== 'duo') {
        toast.error('That code is for a race, not a duo session');
        navigate('/race/join');
        return;
      }
      // Need to know hunt's totalStops
      const huntRow = await huntsService.getHuntById(race.huntId).catch(() => null);
      const totalStops = huntRow?.stops.length ?? 0;
      await raceService.joinSession(
        race.id,
        currentProfile?.name ?? 'Kid',
        '🧒',
        totalStops,
        'kid_solver',
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

  // Find the kid participant (anything that isn't this user / the parent_guide)
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
          <h1 className="text-base font-black flex-1">Join family hunt</h1>
        </div>

        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-black">Type the code</h2>
            <p className="text-sm text-muted-foreground leading-snug max-w-sm mx-auto">
              Ask your parent for the 6-letter code on their phone, then type it here.
            </p>
          </div>

          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD23"
            maxLength={6}
            autoFocus
            className="w-full h-16 text-center text-3xl font-black tracking-[0.4em] uppercase rounded-2xl border-2 border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />

          <button
            onClick={handleJoin}
            disabled={working || joinCode.length < 4}
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
  if (!hunt || !session) {
    return null;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-primary/5 via-background to-background pb-tab-bar">
      <div
        className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b px-4 flex items-center gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)', paddingBottom: 10, minHeight: 52 }}
      >
        <button onClick={() => navigate(`/hunts/${hunt.slug}`)} className="tap-highlight w-8 h-8 flex items-center justify-center -ml-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-black flex-1 truncate">Two-phone hunt</h1>
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
              <p className="text-[11px] text-muted-foreground mt-0.5">{hunt.stops.length} stops · {hunt.city}</p>
            </div>
          </div>
        </div>

        {/* Big join code */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/30 p-6 text-center space-y-2 shadow-md">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary/80">Kid's join code</p>
          <p className="text-5xl font-black tracking-[0.3em] text-primary">{session.joinCode}</p>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-background border text-xs font-semibold text-primary tap-highlight"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>

        {/* How it works card */}
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm leading-tight">How two-phone mode works</p>
              <ol className="text-[13px] text-muted-foreground leading-snug mt-2 space-y-1.5 list-decimal pl-4">
                <li>Kid opens FamActify on their phone and goes to <span className="font-semibold text-foreground">Profile → Two-phone hunt</span> or types <span className="font-mono">/duo/join</span></li>
                <li>Kid types the 6-letter code above</li>
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
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base">
                  {p.role === 'parent_guide' ? '🧑‍🏫' : p.role === 'kid_solver' ? '🧒' : p.familyEmoji}
                </div>
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
              <Loader2 className="w-3 h-3 animate-spin" /> Waiting for kid to join…
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
          {kidJoined ? 'Start playing!' : 'Waiting for kid…'}
        </button>

        <p className="text-[11px] text-center text-muted-foreground leading-snug">
          You can also start solo and let the kid join later — just keep this code handy.
        </p>
      </div>
    </div>
  );
}
