/**
 * FamilyModeContext — who is currently using the app
 *
 * Profiles live in localStorage. The current profile is also persisted.
 * No accounts required — privacy-safe, COPPA-friendly.
 *
 * Modes:
 *   parent        — full access, plan creation, approval
 *   kid-planner   — ~8-12 yrs: can browse, wishlist, vote on plan slots
 *   little-explorer — ~3-7 yrs: big colorful tap cards, hearts → wishlist
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FamilyMode = 'parent' | 'kid' | 'little-explorer';

export interface FamilyProfile {
  id: string;
  name: string;
  emoji: string;   // avatar emoji
  color: string;   // tailwind bg color class for avatar
  mode: FamilyMode;
  age?: number;
}

interface FamilyModeContextType {
  profiles: FamilyProfile[];
  currentProfile: FamilyProfile | null;
  isParent: boolean;
  isKid: boolean;          // any non-parent (kid or little-explorer)
  isLittleExplorer: boolean; // ≤5 simplified view
  mode: FamilyMode;
  setCurrentProfile: (profileId: string) => void;
  addProfile: (profile: Omit<FamilyProfile, 'id'>) => void;
  removeProfile: (profileId: string) => void;
  updateProfile: (profileId: string, patch: Partial<FamilyProfile>) => void;
}

const FamilyModeContext = createContext<FamilyModeContextType | null>(null);

const STORAGE_PROFILES = 'famactify-family-profiles';
const STORAGE_CURRENT  = 'famactify-current-profile';

const DEFAULT_PROFILES: FamilyProfile[] = [
  { id: 'parent-default', name: 'Parent', emoji: '👨‍👩‍👧', color: 'bg-primary', mode: 'parent' },
];

function loadProfiles(): FamilyProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PROFILES;
}

function saveProfiles(profiles: FamilyProfile[]) {
  localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles));
}

export function FamilyModeProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<FamilyProfile[]>(loadProfiles);
  const [currentProfileId, setCurrentProfileId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_CURRENT) || profiles[0]?.id || 'parent-default';
  });

  const currentProfile = profiles.find(p => p.id === currentProfileId) ?? profiles[0] ?? null;
  const mode: FamilyMode = currentProfile?.mode ?? 'parent';
  const isParent = mode === 'parent';
  const isKid = mode !== 'parent';                      // kid OR little-explorer
  const isLittleExplorer = mode === 'little-explorer';  // simplified UI only

  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => {
    localStorage.setItem(STORAGE_CURRENT, currentProfileId);
    // Dispatch so AppHeader badge updates across tabs
    window.dispatchEvent(new Event('storage'));
  }, [currentProfileId]);

  const setCurrentProfile = (id: string) => setCurrentProfileId(id);

  const addProfile = (p: Omit<FamilyProfile, 'id'>) => {
    const newProfile: FamilyProfile = { ...p, id: crypto.randomUUID() };
    setProfiles(prev => [...prev, newProfile]);
  };

  const removeProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (currentProfileId === id) {
      setCurrentProfileId(profiles.find(p => p.id !== id)?.id ?? 'parent-default');
    }
  };

  const updateProfile = (id: string, patch: Partial<FamilyProfile>) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  return (
    <FamilyModeContext.Provider value={{
      profiles, currentProfile, isParent, isKid, isLittleExplorer, mode,
      setCurrentProfile, addProfile, removeProfile, updateProfile,
    }}>
      {children}
    </FamilyModeContext.Provider>
  );
}

export function useFamilyMode() {
  const ctx = useContext(FamilyModeContext);
  if (!ctx) throw new Error('useFamilyMode must be used inside FamilyModeProvider');
  return ctx;
}
