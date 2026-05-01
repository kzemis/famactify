import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';
import { authService } from './authService';

type ProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  children?: unknown;
  interests?: unknown;
};

type ProfileUpsert = Database['public']['Tables']['profiles']['Insert'] & {
  children?: unknown;
  interests?: unknown;
};

export interface CurrentProfileResult {
  profile: ProfileRow | null;
  email: string;
}

export const profileService = {
  async getCurrentProfile(): Promise<CurrentProfileResult> {
    assertSupabaseProvider('profileService.getCurrentProfile');
    assertCapability('manage_profile');

    const session = await authService.getCurrentSession();
    if (!session) return { profile: null, email: '' };

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throwIfError('profileService.getCurrentProfile', error);

    return { profile: data as ProfileRow | null, email: session.user.email || '' };
  },

  async saveCurrentProfile(profile: Omit<ProfileUpsert, 'user_id'>): Promise<void> {
    assertSupabaseProvider('profileService.saveCurrentProfile');
    assertCapability('manage_profile');

    const session = await authService.getCurrentSession();
    if (!session) throw new Error('You must be signed in to save your profile');

    const { error } = await supabase
      .from('profiles')
      .upsert({ ...profile, user_id: session.user.id } as any, { onConflict: 'user_id' });

    throwIfError('profileService.saveCurrentProfile', error);
  },
};
