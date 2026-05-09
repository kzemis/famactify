import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import RaceLeaderboard from '@/components/race/RaceLeaderboard';
import { huntsService } from '@/services/huntsService';
import { raceService } from '@/services/raceService';
import { huntQueryKey } from '@/hooks/useHunt';
import type { HuntRace, RaceParticipant, ScavengerHunt } from '@/types/hunt';
import HuntPlay, { type HuntProgressSnapshot } from './HuntPlay';

function mergeParticipant(participants: RaceParticipant[], updated: RaceParticipant): RaceParticipant[] {
  const exists = participants.some(participant => participant.id === updated.id);
  if (!exists) return [updated, ...participants];
  return participants.map(participant => participant.id === updated.id ? updated : participant);
}

export default function RacePlay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<HuntRace | null>(null);
  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [myParticipant, setMyParticipant] = useState<RaceParticipant | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const raceRef = useRef<HuntRace | null>(null);
  const participantRef = useRef<RaceParticipant | null>(null);
  const finishInFlightRef = useRef(false);

  useEffect(() => { raceRef.current = race; }, [race]);
  useEffect(() => { participantRef.current = myParticipant; }, [myParticipant]);

  useEffect(() => {
    if (!raceId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const raceRecord = await raceService.getRace(raceId);
        if (!raceRecord) {
          toast.error('Race not found');
          navigate('/race/join', { replace: true });
          return;
        }
        if (raceRecord.status === 'finished') {
          navigate(`/race/${raceRecord.id}/results`, { replace: true });
          return;
        }

        const [huntRecord, participantRows, myRaceParticipant] = await Promise.all([
          huntsService.getHuntById(raceRecord.huntId).catch(() => null),
          raceService.getParticipants(raceRecord.id),
          raceService.getMyParticipant(raceRecord.id),
        ]);

        if (!huntRecord) {
          toast.error('City game not found');
          navigate('/hunts', { replace: true });
          return;
        }
        if (!myRaceParticipant.participant) {
          toast.error('Join this race before playing');
          navigate(`/race/join?code=${raceRecord.joinCode}`, { replace: true });
          return;
        }
        if (myRaceParticipant.participant.finishedAt) {
          navigate(`/race/${raceRecord.id}/results`, { replace: true });
          return;
        }
        if (cancelled) return;
        setRace(raceRecord);
        queryClient.setQueryData(huntQueryKey(huntRecord.slug), huntRecord as ScavengerHunt);
        setHunt(huntRecord as ScavengerHunt);
        setParticipants(participantRows);
        setMyParticipant(myRaceParticipant.participant);
        setMyUserId(myRaceParticipant.userId);
      } catch (error: any) {
        toast.error(error?.message ?? 'Could not load race');
        navigate('/hunts', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [raceId, navigate, queryClient]);

  useEffect(() => {
    if (!race?.id) return;
    const unsubscribe = raceService.subscribeToRace(
      race.id,
      updatedParticipants => {
        setParticipants(updatedParticipants);
        if (myUserId) {
          const updatedParticipant = updatedParticipants.find(participant => participant.userId === myUserId);
          if (updatedParticipant) setMyParticipant(updatedParticipant);
        }
      },
      updatedRace => {
        setRace(updatedRace);
        if (updatedRace.status === 'finished') {
          navigate(`/race/${updatedRace.id}/results`, { replace: true });
        }
      },
    );
    raceService.getParticipants(race.id).then(setParticipants);
    return unsubscribe;
  }, [race?.id, myUserId, navigate]);

  const totalStops = useMemo(() => {
    return hunt?.stops.length || myParticipant?.totalStops || participants[0]?.totalStops || 0;
  }, [hunt?.stops.length, myParticipant?.totalStops, participants]);

  const handleRaceProgress = useCallback(async (snapshot: HuntProgressSnapshot) => {
    const activeRace = raceRef.current;
    const activeParticipant = participantRef.current;
    if (!activeRace || !activeParticipant) return;

    const localParticipant: RaceParticipant = {
      ...activeParticipant,
      currentStop: snapshot.currentStopOrder,
      score: snapshot.score,
      totalStops: snapshot.totalStops,
    };
    setMyParticipant(localParticipant);
    setParticipants(current => mergeParticipant(current, localParticipant));

    if (!snapshot.completed) {
      await raceService.updateProgress(activeParticipant.id, snapshot.currentStopOrder, snapshot.score);
      return;
    }

    if (finishInFlightRef.current || activeParticipant.finishedAt) return;
    finishInFlightRef.current = true;
    setFinishing(true);
    try {
      await raceService.finishParticipant(activeParticipant.id, snapshot.score, snapshot.totalStops);
      const latestParticipants = await raceService.getParticipants(activeRace.id);
      const normalizedParticipants = latestParticipants.map(participant => participant.id === activeParticipant.id
        ? {
            ...participant,
            currentStop: snapshot.totalStops,
            score: snapshot.score,
            totalStops: snapshot.totalStops,
            finishedAt: participant.finishedAt ?? new Date().toISOString(),
          }
        : participant);
      setParticipants(normalizedParticipants);

      const allFinished = normalizedParticipants.length > 0 && normalizedParticipants.every(participant => (
        !!participant.finishedAt || participant.currentStop >= (participant.totalStops || snapshot.totalStops)
      ));
      if (allFinished) {
        try {
          await raceService.finishRace(activeRace.id);
        } catch (error) {
          console.warn('[race finish sync]', error);
        }
      }
      navigate(`/race/${activeRace.id}/results`, { replace: true });
    } catch (error: any) {
      console.warn('[race participant finish]', error);
      toast.error(error?.message ?? 'Race finish did not sync');
      finishInFlightRef.current = false;
      setFinishing(false);
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading race…</p>
      </div>
    );
  }

  if (!race || !hunt || !myParticipant) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Zap className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Race unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">Join the race again from the lobby.</p>
        </div>
        <button
          onClick={() => navigate('/race/join')}
          className="h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Join Race
        </button>
      </div>
    );
  }

  if (race.status !== 'racing') {
    return (
      <div className="min-h-[100dvh] bg-background pb-24">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="tap-highlight" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">{hunt.title}</h1>
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div className="max-w-md mx-auto px-4 py-10 space-y-5 text-center">
          <div className="rounded-3xl border bg-card p-6 space-y-3">
            <Users className="w-12 h-12 mx-auto text-primary" />
            <h2 className="text-2xl font-black">Waiting for the host</h2>
            <p className="text-sm text-muted-foreground">The race will open automatically when the host starts it.</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Join code {race.joinCode}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <HuntPlay
        huntSlug={hunt.slug}
        onRaceProgress={handleRaceProgress}
        raceOverlay={(
          <RaceLeaderboard
            participants={participants}
            myUserId={myUserId ?? undefined}
            totalStops={totalStops}
          />
        )}
      />
      {finishing && (
        <div className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-[100] mx-auto max-w-sm rounded-2xl border bg-card/95 shadow-xl backdrop-blur px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-bold">Finishing race…</p>
            <p className="text-xs text-muted-foreground">Syncing your final score.</p>
          </div>
        </div>
      )}
    </>
  );
}
