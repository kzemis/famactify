import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { huntsService, type ScavengerHunt } from '@/services/huntsService';

export const HUNT_QUERY_STALE_TIME_MS = 5 * 60_000;

export const huntQueryKey = (slug?: string | null) => ['hunt', slug ?? ''] as const;

export function useHunt(slug?: string | null): UseQueryResult<ScavengerHunt | null, Error> {
  return useQuery({
    queryKey: huntQueryKey(slug),
    queryFn: () => huntsService.getHunt(slug!),
    enabled: !!slug,
    staleTime: HUNT_QUERY_STALE_TIME_MS,
  });
}
