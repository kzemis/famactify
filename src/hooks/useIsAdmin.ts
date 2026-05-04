import { useEffect, useRef, useState } from 'react';
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
  const checkedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async (showInitialLoading = false) => {
      if (showInitialLoading && !checkedOnceRef.current) setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setIsAdmin(false);
            checkedOnceRef.current = true;
            setLoading(false);
          }
          return;
        }
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
        if (!cancelled) {
          checkedOnceRef.current = true;
          setLoading(false);
        }
      }
    };

    check(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setIsAdmin(false);
        checkedOnceRef.current = true;
        setLoading(false);
        return;
      }

      // Supabase can emit TOKEN_REFRESHED / USER_UPDATED when the tab regains
      // focus. Re-check admin in the background, but do not flip loading back
      // to true after the first check — that would unmount admin form pages and
      // wipe unsaved drafts.
      check(!checkedOnceRef.current);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  return { isAdmin, loading };
}
