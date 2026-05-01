import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';
import { authService } from './authService';

type SavedTripRow = Database['public']['Tables']['saved_trips']['Row'];
type SavedTripInsert = Database['public']['Tables']['saved_trips']['Insert'];

export interface TripEvent {
  id?: string;
  title?: string;
  image?: string;
  date?: string;
  time?: string;
  name?: string;
  imageurlthumb?: string | null;
  activityId?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  location?: string;
  address?: string | null;
  lat?: number | null;
  lon?: number | null;
  description?: string;
  price?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  source?: string;
  planDate?: string | null;
}

export interface TripConfirmationSummary {
  total: number;
  confirmed: number;
  confirmedEmails: string[];
  pendingEmails: string[];
}

export interface SavedTrip extends Omit<SavedTripRow, 'events'> {
  events: TripEvent[];
  confirmations?: TripConfirmationSummary;
}

export interface CreateTripInput {
  name: string;
  events: TripEvent[];
  total_cost: number;
  total_events: number;
  user_id?: string;
}

function normalizeTrip(row: SavedTripRow): SavedTrip {
  return {
    ...row,
    events: Array.isArray(row.events) ? row.events as unknown as TripEvent[] : [],
    total_cost: row.total_cost ?? 0,
    total_events: row.total_events ?? 0,
  };
}

export const tripsService = {
  async listForUser(userId: string): Promise<SavedTrip[]> {
    assertSupabaseProvider('tripsService.listForUser');
    assertCapability('save_trip');

    const { data, error } = await supabase
      .from('saved_trips')
      .select('id, name, events, total_cost, total_events, created_at, updated_at, recipients, share_token, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    throwIfError('tripsService.listForUser', error);
    return ((data as SavedTripRow[]) || []).map(normalizeTrip);
  },

  async listCurrentUserWithConfirmations(): Promise<SavedTrip[]> {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const trips = await this.listForUser(user.id);
    return Promise.all(trips.map(async (trip) => {
      const { data, error } = await supabase
        .from('trip_confirmations')
        .select('confirmed, recipient_email')
        .eq('trip_id', trip.id);

      throwIfError('tripsService.listCurrentUserWithConfirmations.confirmations', error);

      const confirmations = data || [];
      return {
        ...trip,
        confirmations: {
          total: confirmations.length,
          confirmed: confirmations.filter(item => item.confirmed).length,
          confirmedEmails: confirmations.filter(item => item.confirmed).map(item => item.recipient_email),
          pendingEmails: confirmations.filter(item => !item.confirmed).map(item => item.recipient_email),
        },
      };
    }));
  },

  async createTrip(input: CreateTripInput): Promise<Pick<SavedTripRow, 'id' | 'share_token'>> {
    assertSupabaseProvider('tripsService.createTrip');
    assertCapability('save_trip');

    const userId = input.user_id ?? (await authService.getCurrentUser())?.id;
    if (!userId) throw new Error('You must be signed in to save a plan');

    const payload: SavedTripInsert = {
      user_id: userId,
      name: input.name,
      events: input.events as unknown as Json,
      total_cost: input.total_cost,
      total_events: input.total_events,
    };

    const { data, error } = await supabase
      .from('saved_trips')
      .insert(payload)
      .select('id, share_token')
      .single();

    throwIfError('tripsService.createTrip', error);
    return data as Pick<SavedTripRow, 'id' | 'share_token'>;
  },

  async deleteTrip(id: string): Promise<void> {
    assertSupabaseProvider('tripsService.deleteTrip');
    assertCapability('save_trip');

    const { error } = await supabase.from('saved_trips').delete().eq('id', id);
    throwIfError('tripsService.deleteTrip', error);
  },
};
