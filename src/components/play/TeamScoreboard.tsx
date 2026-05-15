// MP-T2: Opposing team scoreboard — shown during team_vs_team sessions.
// Displays each team's progress (current stop / total) and score.

import type { SessionTeam } from '@/types/session';
import { cn } from '@/lib/utils';

interface TeamScoreboardProps {
  teams: SessionTeam[];
  myTeamId: string;
  totalStops: number;
}

export default function TeamScoreboard({ teams, myTeamId, totalStops }: TeamScoreboardProps) {
  if (teams.length < 2) return null;

  const sorted = [...teams].sort((a, b) => {
    // Primary: stop progress descending; secondary: score descending
    if (b.currentStop !== a.currentStop) return b.currentStop - a.currentStop;
    return b.score - a.score;
  });

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">🏆 Race standings</p>
      </div>
      <div className="divide-y">
        {sorted.map((team, i) => {
          const isMe = team.id === myTeamId;
          const progress = Math.min(100, (team.currentStop / Math.max(1, totalStops)) * 100);
          return (
            <div key={team.id} className={cn('px-3 py-2.5', isMe && 'bg-primary/5')}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base shrink-0">{team.emoji}</span>
                <p className={cn('text-sm font-semibold flex-1 truncate', isMe && 'text-primary')}>
                  {isMe ? `${team.name} (you)` : team.name}
                </p>
                <span className="text-xs font-bold text-muted-foreground shrink-0">
                  {team.currentStop}/{totalStops}
                  {team.finishedAt && ' ✓'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: team.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
