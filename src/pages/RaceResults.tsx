// Race Results — final rankings after a live multi-family race.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { raceService } from '@/services/raceService';
import { huntsService } from '@/services/huntsService';
import type { HuntRace, RaceParticipant, ScavengerHunt } from '@/types/hunt';

const PODIUM_STYLES = [
  'bg-gradient-to-br from-yellow-400 to-amber-500 text-white', // 1st
  'bg-gradient-to-br from-gray-300 to-gray-400 text-white',    // 2nd
  'bg-gradient-to-br from-amber-600 to-amber-700 text-white',  // 3rd
];

export default function RaceResults() {
  const navigate = useNavigate();
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<HuntRace | null>(null);
  const [hunt, setHunt] = useState<ScavengerHunt | null>(null);
  const [participants, setParticipants] = useState<RaceParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const finishingRaceRef = useRef(false);

  useEffect(() => {
    if (!raceId) return;
    Promise.all([
      raceService.getRace(raceId),
      raceService.getParticipants(raceId),
    ]).then(async ([r, p]) => {
      setRace(r);
      setParticipants(p);
      if (r) {
        const h = await huntsService.getHuntById(r.huntId).catch(() => null);
        if (h) setHunt(h as any);
      }
      setLoading(false);
    });
  }, [raceId]);

  useEffect(() => {
    if (!raceId || !race?.id) return;
    const unsubscribe = raceService.subscribeToRace(raceId, setParticipants, setRace);
    return unsubscribe;
  }, [raceId, race?.id]);

  useEffect(() => {
    if (!race || race.status === 'finished' || participants.length === 0 || finishingRaceRef.current) return;
    const allFinished = participants.every(participant => (
      !!participant.finishedAt || participant.currentStop >= participant.totalStops
    ));
    if (!allFinished) return;
    finishingRaceRef.current = true;
    raceService.finishRace(race.id).catch(error => {
      console.warn('[race results finish sync]', error);
      finishingRaceRef.current = false;
    });
  }, [race, participants]);

  const sorted = [...participants].sort((a, b) => {
    // Finished first, then by score desc, then by finish time
    if (a.finishedAt && !b.finishedAt) return -1;
    if (!a.finishedAt && b.finishedAt) return 1;
    if (a.score !== b.score) return b.score - a.score;
    if (a.finishedAt && b.finishedAt) return a.finishedAt.localeCompare(b.finishedAt);
    return b.currentStop - a.currentStop;
  });

  const raceStartedAt = race?.startedAt ? new Date(race.startedAt).getTime() : 0;
  const allParticipantsFinished = sorted.length > 0 && sorted.every(participant => (
    !!participant.finishedAt || participant.currentStop >= participant.totalStops
  ));
  const raceComplete = race?.status === 'finished' || allParticipantsFinished;

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 via-background to-primary/5 pb-24">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hunts')} className="tap-highlight"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-lg font-bold">Race Results</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Trophy header */}
        <div className="text-center space-y-2">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
          <h2 className="text-2xl font-bold">{raceComplete ? 'Race Complete!' : 'Waiting for others…'}</h2>
          {hunt && <p className="text-muted-foreground text-sm">{hunt.title}</p>}
          {!raceComplete && (
            <p className="text-xs text-muted-foreground">Your finish is saved. Standings update as families arrive.</p>
          )}
        </div>

        {/* Podium */}
        {sorted.length >= 1 && (
          <div className="flex items-end justify-center gap-3 py-4">
            {/* 2nd place */}
            {sorted[1] && (
              <div className="text-center">
                <div className={cn('w-16 h-20 rounded-xl flex flex-col items-center justify-center', PODIUM_STYLES[1])}>
                  <span className="text-2xl">{sorted[1].familyEmoji}</span>
                  <Medal className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold mt-1 truncate max-w-[80px]">{sorted[1].familyName}</p>
              </div>
            )}
            {/* 1st place */}
            <div className="text-center -mt-4">
              <Crown className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
              <div className={cn('w-20 h-24 rounded-xl flex flex-col items-center justify-center', PODIUM_STYLES[0])}>
                <span className="text-3xl">{sorted[0].familyEmoji}</span>
                <Trophy className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold mt-1 truncate max-w-[90px]">{sorted[0].familyName}</p>
            </div>
            {/* 3rd place */}
            {sorted[2] && (
              <div className="text-center">
                <div className={cn('w-16 h-16 rounded-xl flex flex-col items-center justify-center', PODIUM_STYLES[2])}>
                  <span className="text-xl">{sorted[2].familyEmoji}</span>
                  <Medal className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-semibold mt-1 truncate max-w-[80px]">{sorted[2].familyName}</p>
              </div>
            )}
          </div>
        )}

        {/* Full results table */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="divide-y">
            {sorted.map((p, i) => {
              const elapsed = p.finishedAt && raceStartedAt
                ? Math.round((new Date(p.finishedAt).getTime() - raceStartedAt) / 1000)
                : null;
              const mins = elapsed ? Math.floor(elapsed / 60) : null;
              const secs = elapsed ? elapsed % 60 : null;
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xl">{p.familyEmoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.familyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.currentStop}/{p.totalStops} stops · {p.score} pts
                    </p>
                  </div>
                  <div className="text-right">
                    {p.finishedAt ? (
                      <p className="text-xs font-mono font-semibold text-green-600">
                        {mins}:{String(secs).padStart(2, '0')}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">DNF</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => navigate('/hunts')}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold"
        >
          Back to Hunts
        </button>
      </div>
    </div>
  );
}
