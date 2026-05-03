import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useIsAdmin — checks `profiles.is_admin` for the current authenticated user.
 *
 * Returns:
 *  - `loading: true` until the check completes
 *  - `isAdmin: true` if the row exists and is_admin = true
 *  - `isAdmin: false` for everyone else (including signed-out users)
 *
 * Listens to auth changes so the result updates if the user signs in/out.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) { setIsAdmin(false); setLoading(false); } return; }
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        if (error) { console.warn('[useIsAdmin]', error.message); setIsAdmin(false); }
        else setIsAdmin(!!data?.is_admin);
      } catch (e) {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      check();
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return { isAdmin, loading };
}
