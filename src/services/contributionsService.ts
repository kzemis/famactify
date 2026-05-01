import { supabase } from '@/integrations/supabase/client';
import { assertCapability, assertSupabaseProvider, throwIfError } from './core';

const ACTIVITY_IMAGE_BUCKET = 'famactify-images';

export const contributionsService = {
  async uploadActivityImage(filePath: string, file: File): Promise<string> {
    assertSupabaseProvider('contributionsService.uploadActivityImage');
    assertCapability('submit_activity');

    const { error } = await supabase.storage
      .from(ACTIVITY_IMAGE_BUCKET)
      .upload(filePath, file, { contentType: file.type, upsert: true });

    throwIfError('contributionsService.uploadActivityImage', error);

    const { data } = supabase.storage.from(ACTIVITY_IMAGE_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  },

  async canAccessImageBucket(): Promise<boolean> {
    assertSupabaseProvider('contributionsService.canAccessImageBucket');
    assertCapability('submit_activity');

    const { error } = await supabase.storage.from(ACTIVITY_IMAGE_BUCKET).list('', { limit: 1 });
    return !error;
  },
};
