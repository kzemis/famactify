/**
 * Regional formatters — respect user's country RegionConfig.
 * US: $, miles, 12h, MM/DD/YYYY
 * EU: €, km, 24h, DD/MM/YYYY
 *
 * Import: import { formatPrice, formatDistance, formatDate, formatTime } from '@/lib/formatters'
 * Usage:  formatPrice(activity.min_price, regionConfig)
 */

import type { RegionConfig } from '@/i18n/CountryContext';

const KM_PER_MILE = 1.60934;

/** Format a price amount with the correct currency symbol. null/0 → "Free". */
export function formatPrice(amount: number | null | undefined, config: RegionConfig): string {
  if (amount == null || amount === 0) return 'Free';
  return `${config.currency}${amount}`;
}

/** Format a price range: min–max, or "From X", or "Free". */
export function formatPriceRange(
  min: number | null | undefined,
  max: number | null | undefined,
  config: RegionConfig,
): string {
  const hasMin = min != null && min > 0;
  const hasMax = max != null && max > 0;
  const sym = config.currency;

  if (!hasMin && !hasMax) return 'Free';
  if (min === 0 && max === 0) return 'Free';
  if (hasMin && hasMax) return `${sym}${min} – ${sym}${max}`;
  if (hasMin) return `From ${sym}${min}`;
  if (hasMax) return `Up to ${sym}${max}`;
  return 'Price varies';
}

/** Format a distance (always pass km internally; converts to miles for imperial). */
export function formatDistance(km: number, config: RegionConfig): string {
  if (config.units === 'imperial') {
    const miles = km / KM_PER_MILE;
    return `${miles.toFixed(1)} mi`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Distance options for the "Nearby" filter.
 * Values are always in km (used for Haversine); labels respect regionConfig.
 */
export function getDistanceOptions(config: RegionConfig): { value: number; label: string }[] {
  if (config.units === 'imperial') {
    return [
      { value: 1 * KM_PER_MILE,  label: '1 mi' },
      { value: 3 * KM_PER_MILE,  label: '3 mi' },
      { value: 6 * KM_PER_MILE,  label: '6 mi' },
      { value: 15 * KM_PER_MILE, label: '15 mi' },
    ];
  }
  return [
    { value: 2,  label: '2 km' },
    { value: 5,  label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 25, label: '25 km' },
  ];
}

/** Format a date per regionConfig. Accepts Date object or ISO string. */
export function formatDate(date: Date | string, config: RegionConfig): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const day   = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year  = d.getFullYear();
  return config.dateFormat === 'MM/DD/YYYY'
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}

/** Format a time per regionConfig. Accepts Date object or ISO string. */
export function formatTime(date: Date | string, config: RegionConfig): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  if (config.clockFormat === '12h') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Add minutes to a Date and return a new Date. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
