import { track } from '@vercel/analytics';
import { assertCapability } from './core';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export const analyticsService = {
  track(eventName: string, properties: AnalyticsProperties = {}): void {
    assertCapability('track_analytics_event');

    if (import.meta.env.DEV) {
      console.debug('[analyticsService.track]', eventName, properties);
    }

    track(eventName, properties);
  },
};
