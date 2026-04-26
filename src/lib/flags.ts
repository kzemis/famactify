// FamActify — Feature Flags
// Uses Vite env vars: VITE_FF_* prefix
// Set in .env for local dev, in Vercel dashboard for production
// Usage: import { flags } from '@/lib/flags';

export const flags = {
  // Discovery
  rich_filters:        import.meta.env.VITE_FF_RICH_FILTERS        === 'true',
  editor_picks:        import.meta.env.VITE_FF_EDITOR_PICKS        !== 'false', // on by default
  weather_mode:        import.meta.env.VITE_FF_WEATHER_MODE        === 'true',
  kid_explorer:        import.meta.env.VITE_FF_KID_EXPLORER        === 'true',

  // Planning
  saturday_planner:    import.meta.env.VITE_FF_SATURDAY_PLANNER    === 'true',
  family_profile:      import.meta.env.VITE_FF_FAMILY_PROFILE      === 'true',
  family_calendar:     import.meta.env.VITE_FF_FAMILY_CALENDAR     === 'true',

  // Together
  together_mode:       import.meta.env.VITE_FF_TOGETHER_MODE       === 'true',
  kid_view:            import.meta.env.VITE_FF_KID_VIEW            === 'true',

  // Memory
  memory_loop:         import.meta.env.VITE_FF_MEMORY_LOOP         === 'true',

  // Marketplace
  print_on_demand:     import.meta.env.VITE_FF_PRINT_ON_DEMAND     === 'true',
} as const;

export type FeatureFlag = keyof typeof flags;
