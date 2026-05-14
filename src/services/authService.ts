import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { assertSupabaseProvider, throwIfError } from './core';

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    assertSupabaseProvider('authService.getCurrentUser');
    const { data, error } = await supabase.auth.getUser();
    // "Auth session missing" is the normal logged-out state — return null instead of throwing
    if (error && error.name !== 'AuthSessionMissingError') {
      throwIfError('authService.getCurrentUser', error);
    }
    return data?.user ?? null;
  },

  async getCurrentSession(): Promise<Session | null> {
    assertSupabaseProvider('authService.getCurrentSession');
    const { data, error } = await supabase.auth.getSession();
    if (error && error.name !== 'AuthSessionMissingError') {
      throwIfError('authService.getCurrentSession', error);
    }
    return data?.session ?? null;
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

  /**
   * Sends a password-reset email to the given address.
   * The user clicks the link and lands on /auth/reset-password
   * with a temporary recovery session.
   */
  async requestPasswordReset(email: string): Promise<void> {
    assertSupabaseProvider('authService.requestPasswordReset');
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    throwIfError('authService.requestPasswordReset', error);
  },

  /**
   * Updates the current user's password. Must be called from a page reached
   * via a password-reset email link, where Supabase has set up a recovery session.
   */
  async updatePassword(newPassword: string): Promise<void> {
    assertSupabaseProvider('authService.updatePassword');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    throwIfError('authService.updatePassword', error);
  },
};
