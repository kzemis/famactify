/**
 * ProfileSwitcher — Netflix-style "Who's watching?" dropdown in the header.
 * Shows current profile avatar; clicking opens a popover to switch or add profiles.
 */
import { useState } from 'react';
import { useFamilyMode, FamilyMode, FamilyProfile } from '@/contexts/FamilyModeContext';
import { cn } from '@/lib/utils';
import { Plus, Check, Trash2, X } from 'lucide-react';

const MODE_LABELS: Record<FamilyMode, string> = {
  parent: 'Full view',
  'little-explorer': 'Little Explorer',
};

const MODE_EMOJIS: Record<FamilyMode, string> = {
  parent: '🧭',
  'little-explorer': '🌟',
};

// Fun emoji options for kid avatars
const KID_EMOJIS = ['🦁', '🐨', '🦊', '🐸', '🐼', '🦄', '🐯', '🐧', '🦋', '🐬', '🐙', '🦖'];
const PARENT_EMOJIS = ['👨', '👩', '👴', '👵', '👨‍👩‍👧', '🧑'];
const COLORS = [
  'bg-primary', 'bg-orange-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-blue-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500',
];

interface AddProfileFormState {
  name: string;
  emoji: string;
  color: string;
  mode: FamilyMode;
}

export default function ProfileSwitcher() {
  const { profiles, currentProfile, setCurrentProfile, addProfile, removeProfile } = useFamilyMode();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddProfileFormState>({
    name: '', emoji: '🦁', color: 'bg-orange-500', mode: 'parent',
  });

  const handleSwitch = (id: string) => {
    setCurrentProfile(id);
    setOpen(false);
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addProfile({ name: form.name.trim(), emoji: form.emoji, color: form.color, mode: form.mode });
    setAdding(false);
    setForm({ name: '', emoji: '🦁', color: 'bg-orange-500', mode: 'parent' });
  };

  return (
    <div className="relative">
      {/* Current profile pill */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium transition-colors',
          currentProfile?.mode === 'parent'
            ? 'bg-primary/10 hover:bg-primary/20 text-primary'
            : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
        )}
      >
        <span className="text-base leading-none">{currentProfile?.emoji ?? '👤'}</span>
        <span className="hidden sm:inline max-w-[80px] truncate">{currentProfile?.name ?? 'Profile'}</span>
        <span className="text-xs opacity-60">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border bg-card shadow-xl p-3 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-1">
              Who's using FamActify?
            </p>

            {profiles.map(profile => (
              <div key={profile.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleSwitch(profile.id)}
                  className={cn(
                    'flex-1 flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left',
                    profile.id === currentProfile?.id
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent'
                  )}
                >
                  <span className={cn('w-8 h-8 rounded-full flex items-center justify-center text-base', profile.color)}>
                    {profile.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {MODE_EMOJIS[profile.mode]} {MODE_LABELS[profile.mode]}
                    </p>
                  </div>
                  {profile.id === currentProfile?.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
                {profiles.length > 1 && profile.mode !== 'parent' && (
                  <button
                    onClick={() => removeProfile(profile.id)}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            {/* Add profile */}
            {!adding ? (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
              >
                <Plus className="w-4 h-4" /> Add family member
              </button>
            ) : (
              <div className="border rounded-lg p-3 space-y-2.5 mt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Add member</p>
                  <button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>

                <input
                  autoFocus
                  type="text"
                  placeholder="Name (e.g. Emma)"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-md px-2.5 py-1.5 text-sm bg-background"
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />

                {/* Mode — toggle: Full view vs Little Explorer */}
                <div className="flex gap-1.5">
                  {(['parent', 'little-explorer'] as FamilyMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setForm(f => ({
                          ...f, mode: m,
                          emoji: m === 'parent' ? PARENT_EMOJIS[0] : KID_EMOJIS[0],
                          color: m === 'parent' ? 'bg-primary' : 'bg-orange-500',
                        }));
                      }}
                      className={cn(
                        'flex-1 text-xs py-1.5 px-2 rounded-md border transition-colors',
                        form.mode === m ? 'bg-primary text-primary-foreground border-primary' : 'hover:border-primary/50'
                      )}
                    >
                      {MODE_EMOJIS[m]} {MODE_LABELS[m]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground -mt-1">
                  {form.mode === 'little-explorer' ? 'Big colorful cards · age ≤5' : 'Full app access'}
                </p>

                {/* Emoji picker */}
                <div className="flex flex-wrap gap-1">
                  {(form.mode === 'parent' ? PARENT_EMOJIS : KID_EMOJIS).map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className={cn(
                        'w-8 h-8 rounded-full text-lg flex items-center justify-center transition-all',
                        form.emoji === e ? 'ring-2 ring-primary ring-offset-1 scale-110' : 'hover:scale-110'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Color picker */}
                <div className="flex gap-1.5">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn(
                        'w-6 h-6 rounded-full transition-all',
                        c,
                        form.color === c ? 'ring-2 ring-offset-1 ring-foreground scale-110' : ''
                      )}
                    />
                  ))}
                </div>

                <button
                  onClick={handleAdd}
                  disabled={!form.name.trim()}
                  className="w-full py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
                >
                  Add {form.name || 'member'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
