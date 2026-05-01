export type CapabilityId =
  | 'view_activities'
  | 'search_activities'
  | 'plan_trip'
  | 'save_trip'
  | 'manage_profile'
  | 'request_recommendations'
  | 'send_calendar_invite'
  | 'track_analytics_event'
  | 'submit_activity'
  | 'manage_curated_lists';

export interface CapabilityDefinition {
  id: CapabilityId;
  layer: 'atomic-capability';
  description: string;
}

export const serviceCapabilities: Record<CapabilityId, CapabilityDefinition> = {
  view_activities: {
    id: 'view_activities',
    layer: 'atomic-capability',
    description: 'Read family activity records for discovery, planning, and map surfaces.',
  },
  search_activities: {
    id: 'search_activities',
    layer: 'atomic-capability',
    description: 'Search and filter activity records by family-relevant attributes.',
  },
  plan_trip: {
    id: 'plan_trip',
    layer: 'atomic-capability',
    description: 'Compose activity records into an ordered family plan.',
  },
  save_trip: {
    id: 'save_trip',
    layer: 'atomic-capability',
    description: 'Persist, list, share, or delete saved family plans.',
  },
  manage_profile: {
    id: 'manage_profile',
    layer: 'atomic-capability',
    description: 'Read and update a family profile.',
  },
  request_recommendations: {
    id: 'request_recommendations',
    layer: 'atomic-capability',
    description: 'Request AI-generated recommendations or questions.',
  },
  send_calendar_invite: {
    id: 'send_calendar_invite',
    layer: 'atomic-capability',
    description: 'Send calendar invites and attendance flows.',
  },
  track_analytics_event: {
    id: 'track_analytics_event',
    layer: 'atomic-capability',
    description: 'Track privacy-aware product analytics events.',
  },
  submit_activity: {
    id: 'submit_activity',
    layer: 'atomic-capability',
    description: 'Submit or edit contributed activity records.',
  },
  manage_curated_lists: {
    id: 'manage_curated_lists',
    layer: 'atomic-capability',
    description: 'Create, update, delete, and publish curated activity lists.',
  },
};

export interface SurfaceCapabilityDeclaration {
  surface: string;
  capabilities: CapabilityId[];
  providerAgnostic: true;
}

export function declareSurfaceCapabilities(
  surface: string,
  capabilities: CapabilityId[],
): SurfaceCapabilityDeclaration {
  return { surface, capabilities, providerAgnostic: true };
}

export function assertCapability(_capability: CapabilityId): void {
  // Capability-lite phase: all authenticated/anonymous authorization is still enforced by Supabase RLS.
  // This boundary exists so future role/bundle checks can be added without changing pages.
}
