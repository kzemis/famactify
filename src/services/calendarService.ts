import { supabase } from '@/integrations/supabase/client';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';

export const calendarService = {
  async sendCalendarInvite<TPayload extends Record<string, unknown>, TResult = unknown>(payload: TPayload): Promise<TResult> {
    assertSupabaseProvider('calendarService.sendCalendarInvite');
    assertCapability('send_calendar_invite');

    const { data, error } = await supabase.functions.invoke('send-calendar-invite', { body: payload });
    throwIfError('calendarService.sendCalendarInvite', error);
    return data as TResult;
  },

  async confirmAttendance<TPayload extends Record<string, unknown>, TResult = unknown>(payload: TPayload): Promise<TResult> {
    assertSupabaseProvider('calendarService.confirmAttendance');
    assertCapability('send_calendar_invite');

    const { data, error } = await supabase.functions.invoke('confirm-attendance', { body: payload });
    throwIfError('calendarService.confirmAttendance', error);
    return data as TResult;
  },
};
