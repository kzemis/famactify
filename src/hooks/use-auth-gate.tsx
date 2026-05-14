import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AuthGateRequest {
  to: string;
  reason: string;
}

interface AuthGateContextValue {
  isAuthenticated: boolean | null; // null = unknown (loading)
  gateOrNavigate: (request: AuthGateRequest) => void;
  // Internal — consumed by <AuthGate /> only
  pendingRequest: AuthGateRequest | null;
  dismiss: () => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pendingRequest, setPendingRequest] = useState<AuthGateRequest | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const gateOrNavigate = useCallback((request: AuthGateRequest) => {
    if (isAuthenticated) {
      navigate(request.to);
    } else {
      setPendingRequest(request);
    }
  }, [isAuthenticated, navigate]);

  const dismiss = useCallback(() => setPendingRequest(null), []);

  const value = useMemo<AuthGateContextValue>(() => ({
    isAuthenticated,
    gateOrNavigate,
    pendingRequest,
    dismiss,
  }), [isAuthenticated, gateOrNavigate, pendingRequest, dismiss]);

  return <AuthGateContext.Provider value={value}>{children}</AuthGateContext.Provider>;
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used inside <AuthGateProvider>");
  return ctx;
}
