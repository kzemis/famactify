// Floating mini-leaderboard shown during live race play.

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RaceParticipant } from '@/types/hunt';
import ParticipantAvatar from '@/components/ParticipantAvatar';

interface Props {
  participants: RaceParticipant[];
  myUserId?: string;
  totalStops: number;
}

export default function RaceLeaderboard({ participants, myUserId, totalStops }: Props) {
  const [expanded, setExpanded] = useState(true);

  const sorted = [...participants].sort((a, b) => {
    if (a.finishedAt && !b.finishedAt) return -1;
    if (!a.finishedAt && b.finishedAt) return 1;
    if (a.currentStop !== b.currentStop) return b.currentStop - a.currentStop;
    return b.score - a.score;
  });

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top)+56px)] right-3 z-30 w-52 rounded-2xl border bg-card/95 backdrop-blur shadow-xl overflow-hidden animate-in slide-in-from-right">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-3 py-2 flex items-center gap-2 tap-highlight border-b"
      >
        <Trophy className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold flex-1 text-left">Race</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="divide-y max-h-60 overflow-y-auto">
          {sorted.map((p, i) => {
            const isMe = p.userId === myUserId;
            const pct = totalStops > 0 ? Math.round((p.currentStop / totalStops) * 100) : 0;
            return (
              <div key={p.id} className={cn('px-3 py-2 flex items-center gap-2', isMe && 'bg-primary/5')}>
                <span className="text-xs font-bold w-4 text-center text-muted-foreground">{i + 1}</span>
                <ParticipantAvatar p={p} size={24} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[11px] font-semibold truncate', isMe && 'text-primary')}>{p.familyName}</p>
                  <div className="h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', p.finishedAt ? 'bg-green-500' : 'bg-primary')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold">{p.currentStop}/{totalStops}</p>
                  {p.finishedAt && <span className="text-[9px] text-green-600 font-semibold">Done!</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
