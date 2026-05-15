// MP-T2: Unified Sessions + Teams engine — TypeScript types
// Mirrors the hunt_sessions / hunt_session_teams / hunt_session_participants / hunt_session_artifacts schema.

export type SessionStatus = 'waiting' | 'playing' | 'finished';
export type TeamMode = 'solo' | 'team_collab' | 'team_vs_team' | 'free_for_all';
export type RoleConfig = 'symmetric' | 'guide_and_solver';
export type AdvancePolicy = 'anyone' | 'team_leader' | 'consensus';
export type ArtifactVisibility = 'team_only' | 'all_during_play' | 'all_after_finish';
export type ParticipantRole = 'solver' | 'guide' | 'observer';
export type SessionPreset = 'solo' | 'duo' | 'race' | 'kids_vs_parents' | 'family_squads' | 'mixed' | 'custom';
export type ArtifactKind = 'photo' | 'drawing' | 'audio' | 'mc_pick' | 'text_answer' | 'observation_ack';

export interface HuntSession {
  id: string;
  huntId: string;
  status: SessionStatus;
  teamMode: TeamMode;
  roleConfig: RoleConfig;
  advancePolicy: AdvancePolicy;
  artifactVisibility: ArtifactVisibility;
  maxTeamSize: number | null;
  maxTeams: number | null;
  joinCode: string;
  createdBy: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface SessionTeam {
  id: string;
  sessionId: string;
  name: string;
  color: string;
  emoji: string;
  teamLeaderId: string | null;
  currentStop: number;
  score: number;
  finishedAt: string | null;
  createdAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  teamId: string;
  userId: string;
  displayName: string;
  avatarEmoji: string;
  avatarUrl: string | null;
  role: ParticipantRole;
  joinedAt: string;
}

export interface SessionArtifact {
  id: string;
  sessionId: string;
  teamId: string;
  participantId: string;
  stopId: string;
  stopIndex: number;
  kind: ArtifactKind;
  storageUrl: string | null;
  textValue: string | null;
  createdAt: string;
}
