// MP-T2: Pill badge showing the task type for a given stop — shown to the guide role.
// The guide sees this so they know "📸 Photo task — watch them shoot it".

import type { HuntStop } from '@/types/hunt';

interface PromptTaskBadgeProps {
  stop: HuntStop;
}

const KIND_META: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  text:              { emoji: '✍️', label: 'Written answer',    bg: 'bg-sky-100',     text: 'text-sky-800'    },
  voice_answer:      { emoji: '🎤', label: 'Spoken answer',     bg: 'bg-violet-100',  text: 'text-violet-800' },
  multiple_choice:   { emoji: '🔘', label: 'Multiple choice',   bg: 'bg-emerald-100', text: 'text-emerald-800'},
  photo:             { emoji: '📸', label: 'Photo task',         bg: 'bg-rose-100',    text: 'text-rose-700'   },
  spot_photo:        { emoji: '🔍', label: 'Spot & photo',       bg: 'bg-amber-100',   text: 'text-amber-800'  },
  audio:             { emoji: '🎵', label: 'Record a sound',     bg: 'bg-purple-100',  text: 'text-purple-800' },
  drawing:           { emoji: '🎨', label: 'Drawing task',       bg: 'bg-orange-100',  text: 'text-orange-700' },
  time_travel_photo: { emoji: '⏳', label: 'Time-travel photo',  bg: 'bg-slate-100',   text: 'text-slate-700'  },
  observation:       { emoji: '👁️', label: 'Observation task',   bg: 'bg-teal-100',    text: 'text-teal-800'   },
};

export default function PromptTaskBadge({ stop }: PromptTaskBadgeProps) {
  const kind = stop.prompt?.kind ?? 'text';
  const meta = KIND_META[kind] ?? KIND_META.text;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${meta.bg} ${meta.text}`}>
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </span>
  );
}
