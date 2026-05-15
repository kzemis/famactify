// PlayerIdentityCard — name input + avatar picker used in Duo & Race lobbies.
// Avatar can be an emoji preset OR a selfie/gallery photo upload.
// Photo uploads go to Supabase Storage activity-images/avatars/<userId>/<ts>.<ext>.

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ANIMAL_AVATARS, FAMILY_AVATARS } from '@/lib/avatars';
import { raceService } from '@/services/raceService';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerIdentityCardProps {
  name: string;
  onNameChange: (next: string) => void;
  avatarEmoji: string;
  onAvatarEmojiChange: (emoji: string) => void;
  avatarUrl: string | null;
  onAvatarUrlChange: (url: string | null) => void;
  /** Label shown above the name input */
  nameLabel?: string;
  /** Placeholder inside the name input */
  namePlaceholder?: string;
  /** Show the full avatar picker (emoji grid + photo buttons) inline below the avatar circle */
  showPicker?: boolean;
}

export default function PlayerIdentityCard({
  name,
  onNameChange,
  avatarEmoji,
  onAvatarEmojiChange,
  avatarUrl,
  onAvatarUrlChange,
  nameLabel = 'Your name',
  namePlaceholder = 'Enter your name',
  showPicker = true,
}: PlayerIdentityCardProps) {
  const [uploading, setUploading] = useState(false);
  const selfieRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type.toLowerCase())) {
      toast.error('Photo must be JPEG, PNG, WebP, or HEIC');
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const ownerId = userData.user?.id ?? 'anon';
      const url = await raceService.uploadAvatar(file, ownerId);
      onAvatarUrlChange(url);
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      {/* Avatar preview circle */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover bg-muted"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center text-4xl">
              {avatarEmoji}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-background/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
        {avatarUrl && (
          <button
            onClick={() => onAvatarUrlChange(null)}
            className="text-[11px] text-muted-foreground underline tap-highlight"
          >
            Remove photo
          </button>
        )}
      </div>

      {/* Name input */}
      <div className="space-y-1">
        <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
          {nameLabel}
        </label>
        <input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          maxLength={32}
          className="w-full h-11 rounded-xl border bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {showPicker && (
        <>
          {/* Emoji grid */}
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Choose avatar
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {ANIMAL_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onAvatarEmojiChange(emoji); onAvatarUrlChange(null); }}
                  className={cn(
                    'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors tap-highlight',
                    avatarEmoji === emoji && !avatarUrl
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted/40 hover:bg-muted',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {FAMILY_AVATARS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => { onAvatarEmojiChange(emoji); onAvatarUrlChange(null); }}
                  className={cn(
                    'w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-colors tap-highlight',
                    avatarEmoji === emoji && !avatarUrl
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted/40 hover:bg-muted',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => selfieRef.current?.click()}
              disabled={uploading}
              className="h-10 rounded-xl border bg-muted/40 text-xs font-semibold flex items-center justify-center gap-1.5 tap-highlight disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              Take selfie
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              disabled={uploading}
              className="h-10 rounded-xl border bg-muted/40 text-xs font-semibold flex items-center justify-center gap-1.5 tap-highlight disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Upload photo
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={selfieRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={e => handleFile(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  );
}
