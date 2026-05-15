// MP-T2: Unified results + memory card page.
// Route: /play/:sessionId/results
// Shows celebration, team rankings (for team_vs_team), and per-team artifact memory card.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, ArrowLeft, RotateCcw, Image, Mic, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sessionService } from '@/services/sessionService';
import type { HuntSession, SessionTeam, SessionParticipant, SessionArtifact } from '@/types/session';
import { useHunt } from '@/hooks/useHunt';
import ParticipantAvatar from '@/components/ParticipantAvatar';

function relativeTime(iso: string): string {
  // Show just timestamp during results
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface FullscreenViewerProps {
  url: string;
  onClose: () => void;
}

function FullscreenViewer({ url, onClose }: FullscreenViewerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <img src={url} alt="Memory" className="max-w-full max-h-full object-contain" />
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl flex items-center justify-center"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

function ArtifactCard({ artifact, participant, stopTitle }: { artifact: SessionArtifact; participant?: SessionParticipant; stopTitle?: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (artifact.kind === 'photo' || artifact.kind === 'drawing') {
    if (!artifact.storageUrl) return null;
    return (
      <>
        {fullscreen && <FullscreenViewer url={artifact.storageUrl} onClose={() => setFullscreen(false)} />}
        <button
          onClick={() => setFullscreen(true)}
          className="relative rounded-xl overflow-hidden bg-muted aspect-square group"
        >
          <img src={artifact.storageUrl} alt={artifact.kind} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-1.5">
            {participant && (
              <div className="flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
                <span className="text-[10px]">{participant.avatarEmoji}</span>
                <span className="text-[9px] text-white font-medium max-w-[60px] truncate">{participant.displayName}</span>
              </div>
            )}
          </div>
          {artifact.kind === 'drawing' && (
            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-white/80 rounded-full flex items-center justify-center">
              <Pencil className="w-2.5 h-2.5 text-foreground" />
            </div>
          )}
        </button>
      </>
    );
  }

  if (artifact.kind === 'audio') {
    return (
      <div className="rounded-xl bg-purple-50 border border-purple-200 p-2.5 flex items-center gap-2">
        <div className="shrink-0 w-7 h-7 rounded-full bg-purple-200 flex items-center justify-center">
          <Mic className="w-3.5 h-3.5 text-purple-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-purple-700 truncate">{participant?.displayName ?? 'Player'}</p>
          {artifact.storageUrl && <audio src={artifact.storageUrl} controls className="h-6 w-full max-w-[160px]" />}
        </div>
      </div>
    );
  }

  if (artifact.kind === 'text_answer') {
    return (
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-2.5">
        <p className="text-[10px] text-sky-700 font-semibold mb-0.5">{participant?.displayName ?? 'Player'} answered:</p>
        <p className="text-sm text-sky-900 italic">"{artifact.textValue}"</p>
      </div>
    );
  }

  if (artifact.kind === 'mc_pick') {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs">
        ✅ {participant?.displayName ?? 'Player'} → {artifact.textValue}
      </div>
    );
  }

  // observation_ack — minimal
  return (
    <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      ✓ {participant?.displayName ?? 'Player'} observed
    </div>
  );
}

export default function PlayResults() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<HuntSession | null>(null);
  const [teams, setTeams] = useState<SessionTeam[]>([]);
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [artifacts, setArtifacts] = useState<SessionArtifact[]>([]);
  const [me, setMe] = useState<SessionParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: hunt = null } = useHunt(session?.huntId ?? null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const [sess, teamList, participantList, myParticipant, artifactList] = await Promise.all([
          sessionService.getSession(sessionId),
          sessionService.listTeams(sessionId),
          sessionService.listParticipants(sessionId),
          sessionService.getMyParticipant(sessionId),
          sessionService.listArtifacts(sessionId),
        ]);
        if (cancelled) return;
        setSession(sess);
        setTeams(teamList);
        setParticipants(participantList);
        setMe(myParticipant);
        setArtifacts(artifactList);
      } catch {
        // Silently ignore — still show whatever we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const myTeam = teams.find(t => t.id === me?.teamId);
  const totalStops = hunt?.stops.length ?? 0;
  const isTeamVsTeam = session?.teamMode === 'team_vs_team';

  // Sorted teams for ranking
  const rankedTeams = [...teams].sort((a, b) => {
    if ((b.currentStop ?? 0) !== (a.currentStop ?? 0)) return (b.currentStop ?? 0) - (a.currentStop ?? 0);
    return (b.score ?? 0) - (a.score ?? 0);
  });

  // Determine which teams' artifacts to show
  const visibleArtifactTeamIds: string[] = [];
  if (session?.artifactVisibility === 'all_during_play' || session?.artifactVisibility === 'all_after_finish') {
    visibleArtifactTeamIds.push(...teams.map(t => t.id));
  } else if (myTeam) {
    visibleArtifactTeamIds.push(myTeam.id);
  }

  const visibleArtifacts = artifacts.filter(a => visibleArtifactTeamIds.includes(a.teamId));

  // Group artifacts by stop index
  const artifactsByStop: Record<number, SessionArtifact[]> = {};
  for (const a of visibleArtifacts) {
    if (!artifactsByStop[a.stopIndex]) artifactsByStop[a.stopIndex] = [];
    artifactsByStop[a.stopIndex].push(a);
  }

  const stopIndicesWithArtifacts = Object.keys(artifactsByStop).map(Number).sort((a, b) => a - b);

  function getParticipant(id: string) { return participants.find(p => p.id === id); }
  function getStopTitle(idx: number) { return hunt?.stops[idx]?.title ?? `Step ${idx + 1}`; }

  // Confetti-like medal emoji based on rank
  const MEDALS = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-[100dvh] bg-background pb-24" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
      {/* ── Hero celebration ──────────────────────────────────────────── */}
      <div className="relative w-full pt-16 pb-10 px-6 text-center bg-gradient-to-b from-primary/20 via-background to-background">
        <span className="text-6xl block mb-3">🎉</span>
        <h1 className="text-3xl font-black">Amazing adventure!</h1>
        <p className="text-muted-foreground mt-1">{hunt?.title ?? 'City game'} complete</p>
        {myTeam && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <span className="text-lg">{myTeam.emoji}</span>
            <span className="font-semibold text-sm">{myTeam.name}</span>
            <span className="text-xs">· {Math.min(myTeam.currentStop ?? 0, totalStops)}/{totalStops} steps</span>
          </div>
        )}
      </div>

      <div className="px-4 space-y-6">
        {/* ── Team rankings (team_vs_team) ──────────────────────────── */}
        {isTeamVsTeam && rankedTeams.length > 1 && (
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="font-bold text-sm">Final standings</p>
            </div>
            <div className="divide-y">
              {rankedTeams.map((team, i) => (
                <div key={team.id} className={cn('flex items-center gap-3 px-4 py-3', team.id === myTeam?.id && 'bg-primary/5')}>
                  <span className="text-xl shrink-0">{MEDALS[i] ?? `#${i + 1}`}</span>
                  <span className="text-lg shrink-0">{team.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm', team.id === myTeam?.id && 'text-primary')}>
                      {team.name}{team.id === myTeam?.id ? ' (you)' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">{Math.min(team.currentStop ?? 0, totalStops)}/{totalStops} steps</p>
                  </div>
                  {team.finishedAt && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Finished!</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Memory card ──────────────────────────────────────────────── */}
        {stopIndicesWithArtifacts.length > 0 ? (
          <div>
            <h2 className="text-lg font-black mb-3">📸 Memory card</h2>
            <div className="space-y-5">
              {stopIndicesWithArtifacts.map(stopIdx => (
                <div key={stopIdx}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Step {stopIdx + 1} — {getStopTitle(stopIdx)}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {artifactsByStop[stopIdx].filter(a => a.kind === 'photo' || a.kind === 'drawing').map(a => (
                      <ArtifactCard key={a.id} artifact={a} participant={getParticipant(a.participantId)} stopTitle={getStopTitle(stopIdx)} />
                    ))}
                  </div>
                  {/* Non-visual artifacts in a row below */}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {artifactsByStop[stopIdx].filter(a => !['photo', 'drawing'].includes(a.kind)).map(a => (
                      <ArtifactCard key={a.id} artifact={a} participant={getParticipant(a.participantId)} stopTitle={getStopTitle(stopIdx)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/40 px-4 py-8 text-center">
            <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No memories captured — the adventure was in your head! 🌟</p>
          </div>
        )}

        {/* ── CTAs ─────────────────────────────────────────────────────── */}
        <div className="space-y-2 pb-6">
          <button
            onClick={() => navigate(`/hunts/${hunt?.slug ?? ''}`)}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 tap-highlight"
          >
            <RotateCcw className="w-4 h-4" /> Play again
          </button>
          <button
            onClick={() => navigate('/hunts')}
            className="w-full h-11 rounded-2xl border border-border font-medium text-sm flex items-center justify-center gap-2 tap-highlight"
          >
            <ArrowLeft className="w-4 h-4" /> Back to city games
          </button>
        </div>
      </div>
    </div>
  );
}
