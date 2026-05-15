// MP-T2: Unified Sessions + Teams engine — service layer
// All reads/writes go to the new hunt_sessions/teams/participants/artifacts tables.
// Old hunt_races / hunt_race_participants tables are untouched here.

import { supabase } from '@/integrations/supabase/client';
import type {
  HuntSession,
  SessionTeam,
  SessionParticipant,
  SessionArtifact,
  SessionPreset,
  SessionStatus,
  TeamMode,
  RoleConfig,
  AdvancePolicy,
  ArtifactVisibility,
  ParticipantRole,
  ArtifactKind,
} from '@/types/session';

// ── Preset → config table ────────────────────────────────────────────────
interface PresetConfig {
  teamMode: TeamMode;
  roleConfig: RoleConfig;
  advancePolicy: AdvancePolicy;
  artifactVisibility: ArtifactVisibility;
  maxTeamSize: number | null;
  maxTeams: number | null;
}

const PRESET_CONFIG: Record<string, PresetConfig> = {
  solo:             { teamMode: 'solo',         roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: 1,    maxTeams: 1    },
  duo:              { teamMode: 'team_collab',   roleConfig: 'guide_and_solver',advancePolicy: 'team_leader', artifactVisibility: 'all_during_play',  maxTeamSize: 2,    maxTeams: 1    },
  race:             { teamMode: 'team_vs_team',  roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: 1,    maxTeams: null },
  kids_vs_parents:  { teamMode: 'team_vs_team',  roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: null, maxTeams: 2    },
  family_squads:    { teamMode: 'team_vs_team',  roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: null, maxTeams: null },
  mixed:            { teamMode: 'team_vs_team',  roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: null, maxTeams: null },
  custom:           { teamMode: 'solo',          roleConfig: 'symmetric',       advancePolicy: 'anyone',      artifactVisibility: 'all_after_finish', maxTeamSize: null, maxTeams: null },
};

// ── Row mappers ──────────────────────────────────────────────────────────
function mapSession(r: any): HuntSession {
  return {
    id: r.id,
    huntId: r.hunt_id,
    status: r.status as SessionStatus,
    teamMode: r.team_mode as TeamMode,
    roleConfig: r.role_config as RoleConfig,
    advancePolicy: r.advance_policy as AdvancePolicy,
    artifactVisibility: r.artifact_visibility as ArtifactVisibility,
    maxTeamSize: r.max_team_size ?? null,
    maxTeams: r.max_teams ?? null,
    joinCode: r.join_code,
    createdBy: r.created_by,
    startedAt: r.started_at ?? null,
    finishedAt: r.finished_at ?? null,
    createdAt: r.created_at,
  };
}

function mapTeam(r: any): SessionTeam {
  return {
    id: r.id,
    sessionId: r.session_id,
    name: r.name,
    color: r.color,
    emoji: r.emoji,
    teamLeaderId: r.team_leader_id ?? null,
    currentStop: r.current_stop ?? 0,
    score: r.score ?? 0,
    finishedAt: r.finished_at ?? null,
    createdAt: r.created_at,
  };
}

function mapParticipant(r: any): SessionParticipant {
  return {
    id: r.id,
    sessionId: r.session_id,
    teamId: r.team_id,
    userId: r.user_id,
    displayName: r.display_name,
    avatarEmoji: r.avatar_emoji ?? '🦊',
    avatarUrl: r.avatar_url ?? null,
    role: r.role as ParticipantRole,
    joinedAt: r.joined_at,
  };
}

function mapArtifact(r: any): SessionArtifact {
  return {
    id: r.id,
    sessionId: r.session_id,
    teamId: r.team_id,
    participantId: r.participant_id,
    stopId: r.stop_id,
    stopIndex: r.stop_index,
    kind: r.kind as ArtifactKind,
    storageUrl: r.storage_url ?? null,
    textValue: r.text_value ?? null,
    createdAt: r.created_at,
  };
}

// ── Join code generator ──────────────────────────────────────────────────
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Service ──────────────────────────────────────────────────────────────
export const sessionService = {
  // ── Session lifecycle ──────────────────────────────────────────────────

  async createSession(huntId: string, preset: SessionPreset, displayName?: string, avatarEmoji?: string): Promise<HuntSession> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Sign in to create a session');

    const cfg = PRESET_CONFIG[preset] ?? PRESET_CONFIG.solo;

    // Generate unique join code (retry up to 5×)
    let session: HuntSession | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = generateJoinCode();
      const { data, error } = await supabase
        .from('hunt_sessions')
        .insert({
          hunt_id: huntId,
          status: 'waiting',
          team_mode: cfg.teamMode,
          role_config: cfg.roleConfig,
          advance_policy: cfg.advancePolicy,
          artifact_visibility: cfg.artifactVisibility,
          max_team_size: cfg.maxTeamSize,
          max_teams: cfg.maxTeams,
          join_code: joinCode,
          created_by: auth.user.id,
        })
        .select()
        .single();
      if (!error && data) { session = mapSession(data); break; }
      if (error && !error.message.includes('duplicate')) throw error;
    }
    if (!session) throw new Error('Could not generate a unique join code');

    // Auto-create teams + auto-join host per preset
    const name = displayName ?? auth.user.email?.split('@')[0] ?? 'Player';
    const emoji = avatarEmoji ?? '🦊';

    if (preset === 'solo') {
      // 1 team, host joins as solver
      const team = await sessionService.createTeam(session.id, { name: 'Solo', color: '#ec4899', emoji: '🦊' }, auth.user.id);
      await sessionService._insertParticipant(session.id, team.id, auth.user.id, name, emoji, null, 'solver');
    } else if (preset === 'duo') {
      // 1 team, host joins as guide, team_leader = host
      const team = await sessionService.createTeam(session.id, { name: 'Duo team', color: '#ec4899', emoji: '👨‍👩‍👧' }, auth.user.id, auth.user.id);
      await sessionService._insertParticipant(session.id, team.id, auth.user.id, name, emoji, null, 'guide');
    } else if (preset === 'race') {
      // 1 team for host, host joins as solver
      const team = await sessionService.createTeam(session.id, { name: `${name}'s team`, color: '#ec4899', emoji }, auth.user.id);
      await sessionService._insertParticipant(session.id, team.id, auth.user.id, name, emoji, null, 'solver');
    } else if (preset === 'kids_vs_parents') {
      // 2 teams: Kids + Parents; host joins Kids by default
      await sessionService.createTeam(session.id, { name: 'Kids', color: '#f59e0b', emoji: '🧒' }, auth.user.id);
      await sessionService.createTeam(session.id, { name: 'Parents', color: '#3b82f6', emoji: '🧑‍👧' }, auth.user.id);
    } else {
      // family_squads, mixed, custom — no auto-created teams
    }

    return session;
  },

  // Internal helper — insert participant row (idempotent-safe)
  async _insertParticipant(
    sessionId: string,
    teamId: string,
    userId: string,
    displayName: string,
    avatarEmoji: string,
    avatarUrl: string | null,
    role: ParticipantRole,
  ): Promise<SessionParticipant> {
    // Check existing (idempotent join — same pattern as raceService MP-T1.1)
    const { data: existing } = await supabase
      .from('hunt_session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('hunt_session_participants')
        .update({ display_name: displayName, avatar_emoji: avatarEmoji, avatar_url: avatarUrl })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapParticipant(updated);
    }

    const { data, error } = await supabase
      .from('hunt_session_participants')
      .insert({ session_id: sessionId, team_id: teamId, user_id: userId, display_name: displayName, avatar_emoji: avatarEmoji, avatar_url: avatarUrl, role })
      .select()
      .single();
    if (error) throw error;
    return mapParticipant(data);
  },

  async getSession(sessionId: string): Promise<HuntSession | null> {
    const { data, error } = await supabase
      .from('hunt_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    return mapSession(data);
  },

  async getSessionByCode(joinCode: string): Promise<HuntSession | null> {
    const { data, error } = await supabase
      .from('hunt_sessions')
      .select('*')
      .eq('join_code', joinCode.toUpperCase().trim())
      .maybeSingle();
    if (error || !data) return null;
    return mapSession(data);
  },

  async startSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('hunt_sessions')
      .update({ status: 'playing', started_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  async finishSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('hunt_sessions')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw error;
  },

  // ── Teams ──────────────────────────────────────────────────────────────

  async listTeams(sessionId: string): Promise<SessionTeam[]> {
    const { data, error } = await supabase
      .from('hunt_session_teams')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapTeam);
  },

  async createTeam(
    sessionId: string,
    opts: { name: string; color?: string; emoji?: string },
    _creatorId?: string,
    teamLeaderId?: string,
  ): Promise<SessionTeam> {
    const { data, error } = await supabase
      .from('hunt_session_teams')
      .insert({
        session_id: sessionId,
        name: opts.name,
        color: opts.color ?? '#ec4899',
        emoji: opts.emoji ?? '🦁',
        team_leader_id: teamLeaderId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapTeam(data);
  },

  async updateTeam(teamId: string, opts: { name?: string; color?: string; emoji?: string; currentStop?: number; score?: number }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (opts.name !== undefined) update.name = opts.name;
    if (opts.color !== undefined) update.color = opts.color;
    if (opts.emoji !== undefined) update.emoji = opts.emoji;
    if (opts.currentStop !== undefined) update.current_stop = opts.currentStop;
    if (opts.score !== undefined) update.score = opts.score;
    const { error } = await supabase.from('hunt_session_teams').update(update).eq('id', teamId);
    if (error) throw error;
  },

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('hunt_session_teams').delete().eq('id', teamId);
    if (error) throw error;
  },

  async advanceTeam(teamId: string, newStop: number, totalStops: number): Promise<void> {
    const update: Record<string, unknown> = { current_stop: newStop };
    if (newStop >= totalStops) {
      update.finished_at = new Date().toISOString();
      // Give points for finishing (simple scoring: 1000 - 50 per stop skipped isn't needed yet; just set score)
      update.score = Math.max(0, totalStops * 10 - newStop * 0); // placeholder, keep as-is
    }
    const { error } = await supabase.from('hunt_session_teams').update(update).eq('id', teamId);
    if (error) throw error;
  },

  // ── Participants ───────────────────────────────────────────────────────

  async listParticipants(sessionId: string): Promise<SessionParticipant[]> {
    const { data, error } = await supabase
      .from('hunt_session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapParticipant);
  },

  async getMyParticipant(sessionId: string): Promise<SessionParticipant | null> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from('hunt_session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (error || !data) return null;
    return mapParticipant(data);
  },

  async joinSession(
    sessionId: string,
    opts: { teamId?: string; displayName: string; avatarEmoji: string; avatarUrl?: string | null; role?: ParticipantRole },
  ): Promise<SessionParticipant> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Sign in to join a session');

    const role: ParticipantRole = opts.role ?? 'solver';

    // Idempotent: check existing participant
    const { data: existing } = await supabase
      .from('hunt_session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabase
        .from('hunt_session_participants')
        .update({ display_name: opts.displayName, avatar_emoji: opts.avatarEmoji, avatar_url: opts.avatarUrl ?? null })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return mapParticipant(updated);
    }

    // Determine which team to join
    let teamId = opts.teamId ?? null;
    if (!teamId) {
      // Get all teams for this session
      const teams = await sessionService.listTeams(sessionId);
      const session = await sessionService.getSession(sessionId);
      if (teams.length === 0) throw new Error('No teams found — cannot join');

      if (!session) throw new Error('Session not found');

      if (session.teamMode === 'team_vs_team' && session.teamMode !== 'solo') {
        // Race-like: create a new team for this joiner
        const newTeam = await sessionService.createTeam(sessionId, {
          name: `${opts.displayName}'s team`,
          color: '#ec4899',
          emoji: opts.avatarEmoji,
        });
        teamId = newTeam.id;
      } else {
        // solo / team_collab: join the first (and only) team
        teamId = teams[0].id;
      }
    }

    const { data, error } = await supabase
      .from('hunt_session_participants')
      .insert({
        session_id: sessionId,
        team_id: teamId,
        user_id: auth.user.id,
        display_name: opts.displayName,
        avatar_emoji: opts.avatarEmoji,
        avatar_url: opts.avatarUrl ?? null,
        role,
      })
      .select()
      .single();
    if (error) throw error;
    return mapParticipant(data);
  },

  async updateMyIdentity(participantId: string, opts: { displayName?: string; avatarEmoji?: string; avatarUrl?: string | null }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (opts.displayName !== undefined) update.display_name = opts.displayName;
    if (opts.avatarEmoji !== undefined) update.avatar_emoji = opts.avatarEmoji;
    if (opts.avatarUrl !== undefined) update.avatar_url = opts.avatarUrl;
    const { error } = await supabase.from('hunt_session_participants').update(update).eq('id', participantId);
    if (error) throw error;
  },

  async switchTeam(participantId: string, newTeamId: string): Promise<void> {
    const { error } = await supabase
      .from('hunt_session_participants')
      .update({ team_id: newTeamId })
      .eq('id', participantId);
    if (error) throw error;
  },

  // ── Artifacts ──────────────────────────────────────────────────────────

  async recordArtifact(opts: {
    sessionId: string;
    teamId: string;
    participantId: string;
    stopId: string;
    stopIndex: number;
    kind: ArtifactKind;
    storageUrl?: string | null;
    textValue?: string | null;
  }): Promise<SessionArtifact> {
    const { data, error } = await supabase
      .from('hunt_session_artifacts')
      .insert({
        session_id: opts.sessionId,
        team_id: opts.teamId,
        participant_id: opts.participantId,
        stop_id: opts.stopId,
        stop_index: opts.stopIndex,
        kind: opts.kind,
        storage_url: opts.storageUrl ?? null,
        text_value: opts.textValue ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapArtifact(data);
  },

  async listArtifacts(sessionId: string, opts?: { teamId?: string }): Promise<SessionArtifact[]> {
    let query = supabase
      .from('hunt_session_artifacts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (opts?.teamId) query = query.eq('team_id', opts.teamId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapArtifact);
  },

  async uploadArtifactPhoto(
    file: File,
    sessionId: string,
    participantId: string,
  ): Promise<string> {
    // Guard: 2MB + no HEIC (HEIC can't be displayed natively in browsers)
    if (file.size > 2 * 1024 * 1024) throw new Error('Photo must be under 2 MB');
    const mime = file.type.toLowerCase();
    if (mime.includes('heic') || mime.includes('heif')) {
      throw new Error('HEIC/HEIF photos are not supported — please use JPEG or PNG');
    }

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `session-artifacts/${sessionId}/${participantId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('activity-images')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('activity-images').getPublicUrl(path);
    return urlData.publicUrl;
  },

  // ── Realtime ───────────────────────────────────────────────────────────

  subscribe(
    sessionId: string,
    handlers: {
      onSessionChange?: (s: HuntSession) => void;
      onTeamsChange?: (teams: SessionTeam[]) => void;
      onParticipantsChange?: (participants: SessionParticipant[]) => void;
      onArtifactInsert?: (artifact: SessionArtifact) => void;
    },
  ): () => void {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hunt_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new && handlers.onSessionChange) {
            handlers.onSessionChange(mapSession(payload.new));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hunt_session_teams', filter: `session_id=eq.${sessionId}` },
        async () => {
          // Re-fetch all teams to get consistent state
          if (handlers.onTeamsChange) {
            try {
              const teams = await sessionService.listTeams(sessionId);
              handlers.onTeamsChange(teams);
            } catch { /* ignore */ }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hunt_session_participants', filter: `session_id=eq.${sessionId}` },
        async () => {
          if (handlers.onParticipantsChange) {
            try {
              const participants = await sessionService.listParticipants(sessionId);
              handlers.onParticipantsChange(participants);
            } catch { /* ignore */ }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hunt_session_artifacts', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.new && handlers.onArtifactInsert) {
            handlers.onArtifactInsert(mapArtifact(payload.new));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
