// MP-T2: Live artifact stream — shown to the guide role.
// Renders artifacts as they arrive via Realtime. Photos/drawings as thumbnails,
// audio as chips, MC/text/observation as text rows.
// Receives artifacts via props (don't double-subscribe — parent owns the channel).

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { SessionArtifact, SessionParticipant } from '@/types/session';
import ParticipantAvatar from '@/components/ParticipantAvatar';

interface LiveArtifactStreamProps {
  artifacts: SessionArtifact[];
  participants: SessionParticipant[];
  /** Optional: only show artifacts for a specific stop index */
  stopIndex?: number;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

interface FullscreenViewerProps {
  url: string;
  kind: 'photo' | 'drawing';
  onClose: () => void;
}

function FullscreenViewer({ url, kind, onClose }: FullscreenViewerProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <img src={url} alt={kind} className="max-w-full max-h-full object-contain" />
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-xl"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

export default function LiveArtifactStream({ artifacts, participants, stopIndex }: LiveArtifactStreamProps) {
  const [fullscreen, setFullscreen] = useState<{ url: string; kind: 'photo' | 'drawing' } | null>(null);

  // Filter by stop if requested; newest at top
  const filtered = (stopIndex !== undefined
    ? artifacts.filter(a => a.stopIndex === stopIndex)
    : artifacts
  ).slice().reverse();

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/30 px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground">📱 Artifacts from your teammate will appear here</p>
      </div>
    );
  }

  function getParticipant(participantId: string): SessionParticipant | undefined {
    return participants.find(p => p.id === participantId);
  }

  return (
    <>
      {fullscreen && (
        <FullscreenViewer
          url={fullscreen.url}
          kind={fullscreen.kind}
          onClose={() => setFullscreen(null)}
        />
      )}
      <div className="space-y-2">
        {filtered.map(artifact => {
          const participant = getParticipant(artifact.participantId);
          const avatarProps = participant
            ? { id: participant.id, familyEmoji: participant.avatarEmoji, avatarUrl: participant.avatarUrl, familyName: participant.displayName } as any
            : null;
          const name = participant?.displayName ?? 'Player';

          return (
            <div key={artifact.id} className="flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Avatar */}
              <div className="shrink-0 mt-0.5">
                {avatarProps ? (
                  <ParticipantAvatar p={avatarProps} size={28} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">👤</div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-xs font-semibold">{name}</span>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(artifact.createdAt)}</span>
                </div>

                {/* Photo */}
                {artifact.kind === 'photo' && artifact.storageUrl && (
                  <button
                    onClick={() => setFullscreen({ url: artifact.storageUrl!, kind: 'photo' })}
                    className="block rounded-xl overflow-hidden border w-20 h-20 shadow-sm"
                    aria-label="View full size"
                  >
                    <img src={artifact.storageUrl} alt="Photo" className="w-full h-full object-cover" />
                  </button>
                )}

                {/* Drawing */}
                {artifact.kind === 'drawing' && artifact.storageUrl && (
                  <button
                    onClick={() => setFullscreen({ url: artifact.storageUrl!, kind: 'drawing' })}
                    className="block rounded-xl overflow-hidden border w-20 h-20 bg-white shadow-sm"
                    aria-label="View full size"
                  >
                    <img src={artifact.storageUrl} alt="Drawing" className="w-full h-full object-cover" />
                  </button>
                )}

                {/* Audio */}
                {artifact.kind === 'audio' && artifact.storageUrl && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-100 text-purple-800 text-xs font-medium">
                    🎵 Audio recording
                    <audio src={artifact.storageUrl} controls className="h-6 max-w-[160px]" />
                  </div>
                )}

                {/* MC pick */}
                {artifact.kind === 'mc_pick' && artifact.textValue && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                    ✅ Picked: {artifact.textValue}
                  </span>
                )}

                {/* Text answer */}
                {artifact.kind === 'text_answer' && artifact.textValue && (
                  <p className="text-sm bg-muted/50 rounded-xl px-3 py-1.5 italic">
                    "{artifact.textValue}"
                  </p>
                )}

                {/* Observation ack */}
                {artifact.kind === 'observation_ack' && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <span>✓</span> Acknowledged clue
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
