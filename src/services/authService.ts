import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { assertSupabaseProvider, throwIfError } from './core';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    assertSupabaseProvider('authService.getCurrentUser');
    const { data, error } = await supabase.auth.getUser();
    throwIfError('authService.getCurrentUser', error);
    return data.user;
  },

  async getCurrentSession(): Promise<Session | null> {
    assertSupabaseProvider('authService.getCurrentSession');
    const { data, error } = await supabase.auth.getSession();
    throwIfError('authService.getCurrentSession', error);
    return data.session;
  },

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    assertSupabaseProvider('authService.onAuthStateChange');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => subscription.unsubscribe();
  },

  async signOut(): Promise<void> {
    assertSupabaseProvider('authService.signOut');
    const { error } = await supabase.auth.signOut();
    throwIfError('authService.signOut', error);
  },
};
