// SCV-01 — Live multi-family race service
// Uses Supabase for persistence + Realtime for live updates.

import { supabase } from '@/integrations/supabase/client';
import type { HuntRace, RaceParticipant } from '@/types/hunt';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function mapRace(r: any): HuntRace {
  return {
    id: r.id,
    huntId: r.hunt_id,
    joinCode: r.join_code,
    status: r.status,
    mode: r.mode ?? 'race',
    createdBy: r.created_by,
    startedAt: r.started_at ?? undefined,
    finishedAt: r.finished_at ?? undefined,
    createdAt: r.created_at,
  };
}

function mapParticipant(p: any): RaceParticipant {
  return {
    id: p.id,
    raceId: p.race_id,
    userId: p.user_id,
    familyName: p.family_name,
    familyEmoji: p.family_emoji,
    avatarUrl: p.avatar_url ?? null,
    currentStop: p.current_stop,
    score: p.score,
    totalStops: p.total_stops,
    role: p.role ?? 'player',
    finishedAt: p.finished_at ?? undefined,
    joinedAt: p.joined_at,
  };
}

export const raceService = {
  async createRace(huntId: string): Promise<HuntRace> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Sign in to create a race');

    // Generate unique join code with retry
    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = generateJoinCode();
      const { data, error } = await supabase
        .from('hunt_races')
        .insert({ hunt_id: huntId, join_code: joinCode, created_by: user.user.id })
        .select()
        .single();
      if (!error && data) return mapRace(data);
      if (error && !error.message.includes('duplicate')) throw error;
    }
    throw new Error('Could not generate a unique join code');
  },

  async getRace(raceId: string): Promise<HuntRace | null> {
    const { data, error } = await supabase
      .from('hunt_races')
      .select('*')
      .eq('id', raceId)
      .maybeSingle();
    if (error || !data) return null;
    return mapRace(data);
  },

  async getRaceByCode(joinCode: string): Promise<HuntRace | null> {
    const { data, error } = await supabase
      .from('hunt_races')
      .select('*')
      .eq('join_code', joinCode.toUpperCase().trim())
      .maybeSingle();
    if (error || !data) return null;
    return mapRace(data);
  },

  async getMyParticipant(raceId: string): Promise<{ participant: RaceParticipant | null; userId: string | null }> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return { participant: null, userId: null };

    const { data, error } = await supabase
      .from('hunt_race_participants')
      .select('*')
      .eq('race_id', raceId)
      .eq('user_id', user.user.id)
      .maybeSingle();
    if (error) {
      console.warn('[raceService.getMyParticipant]', error.message);
      return { participant: null, userId: user.user.id };
    }
    return {
      participant: data ? mapParticipant(data) : null,
      userId: user.user.id,
    };
  },

  async joinRace(
    raceId: string,
    familyName: string,
    familyEmoji: string,
    totalStops: number,
    avatarUrl?: string | null,
  ): Promise<RaceParticipant> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Sign in to join a race');

    const { data, error } = await supabase
      .from('hunt_race_participants')
      .insert({
        race_id: raceId,
        user_id: user.user.id,
        family_name: familyName,
        family_emoji: familyEmoji,
        total_stops: totalStops,
        avatar_url: avatarUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapParticipant(data);
  },

  async getParticipants(raceId: string): Promise<RaceParticipant[]> {
    const { data, error } = await supabase
      .from('hunt_race_participants')
      .select('*')
      .eq('race_id', raceId)
      .order('score', { ascending: false });
    if (error || !data) return [];
    return data.map(mapParticipant);
  },

  async startRace(raceId: string): Promise<void> {
    const { error } = await supabase
      .from('hunt_races')
      .update({ status: 'racing', started_at: new Date().toISOString() })
      .eq('id', raceId);
    if (error) throw error;
  },

  async updateProgress(participantId: string, currentStop: number, score: number): Promise<void> {
    const { error } = await supabase
      .from('hunt_race_participants')
      .update({ current_stop: currentStop, score })
      .eq('id', participantId);
    if (error) throw error;
  },

  async finishParticipant(participantId: string, score: number, totalStops: number): Promise<void> {
    const { error } = await supabase
      .from('hunt_race_participants')
      .update({ finished_at: new Date().toISOString(), score, current_stop: totalStops })
      .eq('id', participantId);
    if (error) throw error;
  },

  async finishRace(raceId: string): Promise<void> {
    const rpc = (supabase as any).rpc;
    if (typeof rpc === 'function') {
      const { data: finished, error: rpcError } = await rpc.call(supabase, 'finish_hunt_race_if_done', { p_race_id: raceId });
      if (!rpcError && finished === true) return;
      if (!rpcError && finished === false) throw new Error('Race still has families in progress');
      console.warn('[raceService.finishRace] RPC fallback:', rpcError.message);
    }

    const { error } = await supabase
      .from('hunt_races')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', raceId);
    if (error) throw error;
  },

  // ── Duo mode (parent + kid, two phones, collaborative) ──────────────────

  /** Parent creates a duo session — same as createRace but with mode='duo'. */
  async createDuoSession(huntId: string): Promise<HuntRace> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Sign in to start a duo session');

    for (let attempt = 0; attempt < 5; attempt++) {
      const joinCode = generateJoinCode();
      const { data, error } = await supabase
        .from('hunt_races')
        .insert({
          hunt_id: huntId,
          join_code: joinCode,
          created_by: user.user.id,
          mode: 'duo',
          // Duo sessions don't need a "waiting_for_players" lobby — parent starts immediately
          // when kid joins. We still default to waiting_for_players so the lobby UI can show progress.
        })
        .select()
        .single();
      if (!error && data) return mapRace(data);
      if (error && !error.message.includes('duplicate')) throw error;
    }
    throw new Error('Could not generate a unique join code');
  },

  /**
   * Join an existing session by code. Defaults to 'kid_solver' role for duo sessions
   * (the parent who created the session is auto-added as 'parent_guide').
   */
  async joinSession(
    raceId: string,
    familyName: string,
    familyEmoji: string,
    totalStops: number,
    role: 'player' | 'parent_guide' | 'kid_solver' = 'player',
    avatarUrl?: string | null,
  ): Promise<RaceParticipant> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Sign in to join');

    const { data, error } = await supabase
      .from('hunt_race_participants')
      .insert({
        race_id: raceId,
        user_id: user.user.id,
        family_name: familyName,
        family_emoji: familyEmoji,
        total_stops: totalStops,
        role,
        avatar_url: avatarUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapParticipant(data);
  },

  /** Update a participant's display identity (name, emoji, avatar photo). */
  async updateParticipantIdentity(opts: {
    participantId: string;
    familyName: string;
    familyEmoji: string;
    avatarUrl: string | null;
  }): Promise<void> {
    const { error } = await supabase
      .from('hunt_race_participants')
      .update({
        family_name: opts.familyName,
        family_emoji: opts.familyEmoji,
        avatar_url: opts.avatarUrl,
      })
      .eq('id', opts.participantId);
    if (error) throw error;
  },

  /**
   * Upload an avatar photo to Supabase Storage.
   * Max 2MB, JPEG/PNG/WebP/HEIC only.
   * Returns the public URL.
   */
  async uploadAvatar(file: File, ownerId: string): Promise<string> {
    if (file.size > 2 * 1024 * 1024) throw new Error('Photo must be under 2 MB');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type.toLowerCase())) {
      throw new Error('Photo must be JPEG, PNG, WebP, or HEIC');
    }
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `avatars/${ownerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('activity-images')
      .upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('activity-images').getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Parent guide advances both phones to the next stop in a duo session.
   * Updates current_stop on EVERY participant of this session in one query
   * so kid's phone receives the change via Realtime.
   */
  async advanceDuoStop(raceId: string, newStop: number, totalStops: number): Promise<void> {
    if (newStop >= totalStops) {
      // Mark everyone finished
      const { error } = await supabase
        .from('hunt_race_participants')
        .update({ current_stop: totalStops, finished_at: new Date().toISOString() })
        .eq('race_id', raceId);
      if (error) throw error;
      // Mark session finished
      const { error: rErr } = await supabase
        .from('hunt_races')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('id', raceId);
      if (rErr) throw rErr;
      return;
    }
    const { error } = await supabase
      .from('hunt_race_participants')
      .update({ current_stop: newStop })
      .eq('race_id', raceId);
    if (error) throw error;
  },

  /** Subscribe to race state changes (returns unsubscribe function) */
  subscribeToRace(
    raceId: string,
    onParticipantsChange: (participants: RaceParticipant[]) => void,
    onRaceChange: (race: HuntRace) => void,
  ): () => void {
    const channel = supabase
      .channel(`race-${raceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hunt_race_participants',
        filter: `race_id=eq.${raceId}`,
      }, async () => {
        // Re-fetch all participants on any change
        const participants = await raceService.getParticipants(raceId);
        onParticipantsChange(participants);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'hunt_races',
        filter: `id=eq.${raceId}`,
      }, (payload) => {
        onRaceChange(mapRace(payload.new));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};
