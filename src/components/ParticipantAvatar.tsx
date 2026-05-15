// Renders a participant's avatar: photo if available, otherwise emoji circle.
// Used in lobbies, leaderboard, play screens, and results.

import type { RaceParticipant } from '@/types/hunt';

interface ParticipantAvatarProps {
  p: RaceParticipant;
  size?: number;
  className?: string;
}

export default function ParticipantAvatar({ p, size = 36, className = '' }: ParticipantAvatarProps) {
  if (p.avatarUrl) {
    return (
      <img
        src={p.avatarUrl}
        alt={p.familyName}
        className={`rounded-full object-cover bg-muted shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full bg-muted flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
    >
      {p.familyEmoji}
    </div>
  );
}
