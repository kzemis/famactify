// Race Lobby — create or join a multi-family live race.
// Shows join code, waiting participants, and start button.

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Check, Play, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { raceService } from '@/services/raceService';
import { huntsService } from '@/services/huntsService';
import { huntQueryKey, useHunt } from '@/hooks/useHunt';
import type { HuntRace, RaceParticipant, ScavengerHunt } from '@/types/hunt';

const FAMILY_EMOJIS = ['👨‍👩‍👧', '👨‍👩‍👦', '👩‍👧‍👦', '👨‍👧', '👩‍👦', '👨‍👩‍👧‍👦', '🦸‍♂️', '🦸‍♀️', '🐻', '🦊', '🦁', '🐯'];

export default function RaceLobby() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const joinCodeParam = searchParams.get('code');
  const { data: cachedHunt = null, isFetched: huntFetched } = useHunt(slug);

  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [race, setRace] = useState<HuntRace | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Join form state
  const [joinCode, setJoinCode] = useState(joinCodeParam ?? '');
  const [familyName, setFamilyName] = useState('');
  const [familyEmoji, setFamilyEmoji] = useState(FAMILY_EMOJIS[Math.floor(Math.random() * FAMILY_EMOJIS.length)]);
  const [joining, setJoining] = useState(false);

  const isCreator = !!race && myUserId === race.createdBy;

  // Load hunt if slug provided (creator flow)
  useEffect(() => {
    if (!slug) return;
    if (!huntFetched) return;
    if (cachedHunt) {
      setHunt(cachedHunt);
    } else {
      toast.error('City game not found');
      setLoading(false);
    }
  }, [slug, huntFetched, cachedHunt]);

  // Create race automatically for creator flow
  useEffect(() => {
    if (!hunt || race || joinCodeParam) return;
    raceService.createRace(hunt.id).then(r => {
      setRace(r);
      // Auto-join as creator
      raceService.joinRace(r.id, familyName || 'Host Family', familyEmoji, hunt.stops.length)
        .then(p => {
          setMyParticipantId(p.id);
          setMyUserId(p.userId);
        })
        .catch(() => {});
      setLoading(false);
    }).catch(e => {
      toast.error(e.message);
      setLoading(false);
    });
  }, [hunt, race, joinCodeParam, familyName, familyEmoji]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!race) return;
    const unsub = raceService.subscribeToRace(
      race.id,
      setParticipants,
      (updated) => {
        setRace(updated);
        if (updated.status === 'racing') {
          navigate(`/race/${updated.id}/play`);
        }
      },
    );
    // Initial fetch
    raceService.getParticipants(race.id).then(setParticipants);
    return unsub;
  }, [race, navigate]);

  const handleJoinByCode = useCallback(async () => {
    if (!joinCode.trim() || !familyName.trim()) {
      toast.error('Enter a join code and family name');
      return;
    }
    setJoining(true);
    try {
      const r = await raceService.getRaceByCode(joinCode);
      if (!r) { toast.error('Race not found'); return; }
      if (r.status !== 'waiting_for_players') { toast.error('Race already started'); return; }
      const h = await huntsService.getHuntById(r.huntId).catch(() => null);
      if (h?.slug) queryClient.setQueryData(huntQueryKey(h.slug), h as ScavengerHunt);
      const totalStops = h?.stops.length ?? 0;
      const p = await raceService.joinRace(r.id, familyName, familyEmoji, totalStops);
      setRace(r);
      setMyParticipantId(p.id);
      setMyUserId(p.userId);
      setHunt(h as ScavengerHunt | null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setJoining(false);
    }
  }, [joinCode, familyName, familyEmoji, queryClient]);

  const handleStart = async () => {
    if (!race) return;
    try {
      await raceService.startRace(race.id);
      navigate(`/race/${race.id}/play`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyCode = () => {
    if (!race) return;
    navigator.clipboard?.writeText(race.joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Join-by-code flow (no slug)
  if (!slug && !race) {
    return (
      <div className="min-h-[100dvh] bg-background pb-24">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="tap-highlight"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Join a Race</h1>
        </div>
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <Zap className="w-12 h-12 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Race Mode</h2>
            <p className="text-muted-foreground">Enter the join code from the host family</p>
          </div>
          <div className="space-y-4">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-letter code"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] uppercase h-14 rounded-2xl border bg-card px-4"
              maxLength={6}
            />
            <input
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder="Your family name"
              className="w-full h-12 rounded-2xl border bg-card px-4 text-sm"
            />
            <div className="flex flex-wrap gap-2 justify-center">
              {FAMILY_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setFamilyEmoji(emoji)}
                  className={cn('w-10 h-10 rounded-xl text-lg', familyEmoji === emoji ? 'bg-primary text-primary-foreground' : 'bg-muted')}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={handleJoinByCode}
              disabled={joining || joinCode.length < 6 || !familyName.trim()}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? 'Joining…' : 'Join Race'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby view (creator or joined participant)
  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="tap-highlight"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold flex-1">{hunt?.title ?? 'Race'}</h1>
        <Zap className="w-5 h-5 text-primary" />
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Join Code */}
        {race && (
          <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Join Code</p>
            <button onClick={copyCode} className="inline-flex items-center gap-2 tap-highlight">
              <span className="text-4xl font-mono font-bold tracking-[0.5em] text-primary">{race.joinCode}</span>
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </button>
            <p className="text-xs text-muted-foreground">Share this code with other families to join</p>
          </div>
        )}

        {/* Participants */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm">Families ({participants.length})</span>
          </div>
          {participants.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Waiting for families to join…
              <div className="mt-3 w-6 h-6 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="divide-y">
              {participants.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{p.familyEmoji}</span>
                  <span className="font-semibold text-sm flex-1">{p.familyName}</span>
                  <span className="text-xs text-muted-foreground">Ready</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Start button (creator only) */}
        {isCreator && race?.status === 'waiting_for_players' && participants.length >= 2 && (
          <button
            onClick={handleStart}
            className="w-full h-14 rounded-2xl bg-green-500 text-white font-bold text-lg flex items-center justify-center gap-2 tap-highlight shadow-lg"
          >
            <Play className="w-6 h-6" />
            Start Race!
          </button>
        )}

        {!isCreator && race?.status === 'waiting_for_players' && participants.length >= 2 && (
          <p className="text-center text-sm text-muted-foreground">Waiting for the host family to start…</p>
        )}

        {participants.length < 2 && race && (
          <p className="text-center text-sm text-muted-foreground">Need at least 2 families to start the race</p>
        )}
      </div>
    </div>
  );
}
