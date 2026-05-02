import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import { useFamilyMode, type FamilyMode, type FamilyProfile } from '@/contexts/FamilyModeContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MODE_LABELS: Record<FamilyMode, string> = {
  parent:            'Parent / Adult',
  kid:               'Kid (6+)',
  'little-explorer': 'Little Explorer',
};

const MODE_EMOJIS: Record<FamilyMode, string> = {
  parent:            '🧭',
  kid:               '🧒',
  'little-explorer': '🌟',
};

const KID_EMOJIS  = ['🦁', '🐨', '🦊', '🐸', '🐼', '🦄', '🐯', '🐧', '🦋', '🐬', '🐙', '🦖'];
const COLORS = [
  'bg-primary', 'bg-orange-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-blue-500', 'bg-pink-500', 'bg-amber-500', 'bg-teal-500',
];

export default function KidModePage() {
  const { profiles, currentProfile, setCurrentProfile, addProfile, removeProfile } = useFamilyMode();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', emoji: '🦁', color: 'bg-orange-500', mode: 'kid' as FamilyMode });

  const handleSelect = (profile: FamilyProfile) => {
    setCurrentProfile(profile.id);
    navigate('/activities');
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addProfile({ name: form.name.trim(), emoji: form.emoji, color: form.color, mode: form.mode });
    setAdding(false);
    setForm({ name: '', emoji: '🦁', color: 'bg-orange-500', mode: 'kid' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight">Who's using FamActify?</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pick your profile to get started</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center tap-highlight active:scale-90 transition-transform"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Profile grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {profiles.map(profile => {
          const isSelected = currentProfile?.id === profile.id;
          return (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all tap-highlight active:scale-[0.98]',
                isSelected
                  ? 'border-primary bg-primary/8 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30',
              )}
            >
              {/* Avatar */}
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0', profile.color)}>
                {profile.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <p className={cn('font-bold text-base', isSelected && 'text-primary')}>{profile.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {MODE_EMOJIS[profile.mode]} {MODE_LABELS[profile.mode]}
                </p>
              </div>

              {/* Selected indicator / delete */}
              <div className="flex items-center gap-2">
                {isSelected && (
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">✓</span>
                )}
                {profile.id !== 'parent-default' && (
                  <button
                    onClick={e => { e.stopPropagation(); removeProfile(profile.id); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 tap-highlight transition-colors"
                    aria-label="Remove profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </button>
          );
        })}

        {/* Add profile form */}
        {adding ? (
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <h3 className="font-bold">New family member</h3>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input
                placeholder="e.g. Emma"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="h-11 rounded-xl"
                autoFocus
              />
            </div>

            {/* Mode selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['parent', 'kid', 'little-explorer'] as FamilyMode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, mode: m }))}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition-colors tap-highlight',
                      form.mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground',
                    )}
                  >
                    <span className="text-xl">{MODE_EMOJIS[m]}</span>
                    <span className="leading-tight text-center">{MODE_LABELS[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {KID_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, emoji: e }))}
                    className={cn(
                      'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all tap-highlight',
                      form.emoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Color</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all tap-highlight',
                      c,
                      form.color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : '',
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight"
              >
                Add
              </button>
              <button
                onClick={() => { setAdding(false); setForm({ name: '', emoji: '🦁', color: 'bg-orange-500', mode: 'kid' }); }}
                className="flex-1 h-11 rounded-2xl border border-border text-sm font-medium tap-highlight"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground tap-highlight active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4 h-4" /> Add family member
          </button>
        )}
      </div>
    </div>
  );
}
