import { supabase } from '@/integrations/supabase/client';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';

export const recommendationsService = {
  async generateRecommendations<TPayload extends Record<string, unknown>, TResult = unknown>(payload: TPayload): Promise<TResult> {
    assertSupabaseProvider('recommendationsService.generateRecommendations');
    assertCapability('request_recommendations');

    const { data, error } = await supabase.functions.invoke('generate-recommendations', { body: payload });
    throwIfError('recommendationsService.generateRecommendations', error);
    return data as TResult;
  },

  async generateQuestions<TPayload extends Record<string, unknown>, TResult = unknown>(payload: TPayload): Promise<TResult> {
    assertSupabaseProvider('recommendationsService.generateQuestions');
    assertCapability('request_recommendations');

    const { data, error } = await supabase.functions.invoke('generate-questions', { body: payload });
    throwIfError('recommendationsService.generateQuestions', error);
    return data as TResult;
  },

  async parseActivityInfo<TPayload extends Record<string, unknown>, TResult = unknown>(payload: TPayload): Promise<TResult> {
    assertSupabaseProvider('recommendationsService.parseActivityInfo');
    assertCapability('submit_activity');

    const { data, error } = await supabase.functions.invoke('parse-activity-info', { body: payload });
    throwIfError('recommendationsService.parseActivityInfo', error);
    return data as TResult;
  },
};
