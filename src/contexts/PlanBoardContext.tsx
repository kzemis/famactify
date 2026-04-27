/**
 * PlanBoardContext — shared family plan with slots, options, and voting
 *
 * A PlanBoard has:
 *   - slots: time blocks, each with multiple activity options
 *   - status: draft → sent_to_family → confirmed
 *   - votes: per-profile selection per slot
 *
 * Stored in localStorage — no accounts needed.
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

export interface PlanOption {
  id: string;
  activityId: string;
  name: string;
  address: string | null;
  imageurlthumb: string | null;
  min_price: number | null;
  max_price: number | null;
  duration_minutes: number | null;
  primary_category: string | null;
}

export interface PlanSlot {
  id: string;
  time: string;          // HH:MM
  label: string;         // "Morning", "Lunch", "Afternoon" …
  options: PlanOption[];
  votes: Record<string, string>; // profileId → optionId
  confirmedOptionId?: string;
}

export type PlanStatus = 'draft' | 'sent_to_family' | 'confirmed';

export interface PlanBoard {
  id: string;
  name: string;
  date?: string;
  status: PlanStatus;
  startTime: string;
  createdAt: string;
  slots: PlanSlot[];
}

interface PlanBoardContextType {
  board: PlanBoard | null;
  createBoard: (name: string, startTime?: string) => void;
  clearBoard: () => void;
  addSlot: (time: string, label: string) => PlanSlot;
  removeSlot: (slotId: string) => void;
  addOptionToSlot: (slotId: string, option: Omit<PlanOption, 'id'>) => void;
  removeOptionFromSlot: (slotId: string, optionId: string) => void;
  moveSlot: (slotId: string, direction: 'up' | 'down') => void;
  sendToFamily: () => void;
  vote: (slotId: string, optionId: string, profileId: string) => void;
  confirmSlot: (slotId: string, optionId: string) => void;
  confirmAll: () => void;  // confirm most-voted option per slot
  setBoardName: (name: string) => void;
  pendingVotes: number; // slots that have votes but no confirmation
  totalVotes: number;
}

const PlanBoardContext = createContext<PlanBoardContextType | null>(null);

const STORAGE_KEY = 'famactify-plan-board';

function load(): PlanBoard | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(board: PlanBoard | null) {
  if (board) localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('storage'));
}

function makeSlotLabel(time: string): string {
  const h = parseInt(time.split(':')[0], 10);
  if (h < 11) return 'Morning';
  if (h < 13) return 'Lunch';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

export function PlanBoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<PlanBoard | null>(load);

  const update = useCallback((next: PlanBoard | null) => {
    setBoard(next);
    save(next);
  }, []);

  const createBoard = useCallback((name: string, startTime = '10:00') => {
    update({
      id: crypto.randomUUID(),
      name,
      status: 'draft',
      startTime,
      createdAt: new Date().toISOString(),
      slots: [],
    });
  }, [update]);

  const clearBoard = useCallback(() => update(null), [update]);

  const setBoardName = useCallback((name: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const next = { ...prev, name };
      save(next);
      return next;
    });
  }, []);

  const addSlot = useCallback((time: string, label: string): PlanSlot => {
    const slot: PlanSlot = {
      id: crypto.randomUUID(),
      time,
      label: label || makeSlotLabel(time),
      options: [],
      votes: {},
    };
    setBoard(prev => {
      if (!prev) return prev;
      const slots = [...prev.slots, slot].sort((a, b) => a.time.localeCompare(b.time));
      const next = { ...prev, slots };
      save(next);
      return next;
    });
    return slot;
  }, []);

  const removeSlot = useCallback((slotId: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const next = { ...prev, slots: prev.slots.filter(s => s.id !== slotId) };
      save(next);
      return next;
    });
  }, []);

  const addOptionToSlot = useCallback((slotId: string, option: Omit<PlanOption, 'id'>) => {
    const opt: PlanOption = { ...option, id: crypto.randomUUID() };
    setBoard(prev => {
      if (!prev) return prev;
      const slots = prev.slots.map(s =>
        s.id === slotId
          ? { ...s, options: [...s.options, opt] }
          : s
      );
      const next = { ...prev, slots };
      save(next);
      return next;
    });
  }, []);

  const removeOptionFromSlot = useCallback((slotId: string, optionId: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const slots = prev.slots.map(s =>
        s.id === slotId
          ? { ...s, options: s.options.filter(o => o.id !== optionId) }
          : s
      );
      const next = { ...prev, slots };
      save(next);
      return next;
    });
  }, []);

  const moveSlot = useCallback((slotId: string, direction: 'up' | 'down') => {
    setBoard(prev => {
      if (!prev) return prev;
      const arr = [...prev.slots];
      const idx = arr.findIndex(s => s.id === slotId);
      const swap = direction === 'up' ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= arr.length) return prev;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      const next = { ...prev, slots: arr };
      save(next);
      return next;
    });
  }, []);

  const sendToFamily = useCallback(() => {
    setBoard(prev => {
      if (!prev) return prev;
      const next = { ...prev, status: 'sent_to_family' as PlanStatus };
      save(next);
      return next;
    });
    toast.success('Plan sent to family! Kids can now vote 🗳️');
  }, []);

  const vote = useCallback((slotId: string, optionId: string, profileId: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const slots = prev.slots.map(s =>
        s.id === slotId
          ? { ...s, votes: { ...s.votes, [profileId]: optionId } }
          : s
      );
      const next = { ...prev, slots };
      save(next);
      return next;
    });
  }, []);

  const confirmSlot = useCallback((slotId: string, optionId: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const slots = prev.slots.map(s =>
        s.id === slotId ? { ...s, confirmedOptionId: optionId } : s
      );
      const next = { ...prev, slots };
      save(next);
      return next;
    });
  }, []);

  const confirmAll = useCallback(() => {
    setBoard(prev => {
      if (!prev) return prev;
      const slots = prev.slots.map(s => {
        if (s.confirmedOptionId) return s;
        // Pick most-voted option, fallback to first
        const voteCount: Record<string, number> = {};
        Object.values(s.votes).forEach(optId => {
          voteCount[optId] = (voteCount[optId] || 0) + 1;
        });
        const best = Object.entries(voteCount).sort((a, b) => b[1] - a[1])[0]?.[0]
          ?? s.options[0]?.id;
        return best ? { ...s, confirmedOptionId: best } : s;
      });
      const next = { ...prev, status: 'confirmed' as PlanStatus, slots };
      save(next);
      return next;
    });
    toast.success('Plan confirmed! 🎉');
  }, []);

  const pendingVotes = board?.slots.filter(
    s => !s.confirmedOptionId && Object.keys(s.votes).length > 0
  ).length ?? 0;

  const totalVotes = board?.slots.reduce(
    (sum, s) => sum + Object.keys(s.votes).length, 0
  ) ?? 0;

  return (
    <PlanBoardContext.Provider value={{
      board, createBoard, clearBoard, addSlot, removeSlot,
      addOptionToSlot, removeOptionFromSlot, moveSlot,
      sendToFamily, vote, confirmSlot, confirmAll,
      setBoardName, pendingVotes, totalVotes,
    }}>
      {children}
    </PlanBoardContext.Provider>
  );
}

export function usePlanBoard() {
  const ctx = useContext(PlanBoardContext);
  if (!ctx) throw new Error('usePlanBoard must be used inside PlanBoardProvider');
  return ctx;
}
