import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFunctionsBaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (url && url.includes('.supabase.co')) {
    return url.replace('.supabase.co', '.functions.supabase.co');
  }
  const ref = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ||
              (import.meta.env.VITE_SUPABASE_REF as string | undefined);
  if (ref) {
    return `https://${ref}.functions.supabase.co`;
  }
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PROJECT_ID to build functions URL');
}
