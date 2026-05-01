export type ServiceProvider = 'supabase' | 'api';

export const activeServiceProvider: ServiceProvider =
  import.meta.env.VITE_SERVICE_PROVIDER === 'api' ? 'api' : 'supabase';

export function assertSupabaseProvider(serviceName: string): void {
  if (activeServiceProvider !== 'supabase') {
    throw new Error(`${serviceName} does not have an API provider implementation yet`);
  }
}
