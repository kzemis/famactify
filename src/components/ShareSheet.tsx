import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Copy, ExternalLink, Loader2, Mail, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export interface ShareSheetEvent {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
}

export interface ShareSheetTripData {
  id: string;
  name: string;
  shareUrl: string;
  events: ShareSheetEvent[];
}

interface ShareSheetProps {
  trip: ShareSheetTripData;
  onClose: () => void;
  /** Hide the email section — e.g. for kid mode where email isn't relevant */
  hideEmail?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ShareSheet({ trip, onClose, hideEmail = false }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const message = `Check out our family plan: ${trip.name} 🗺️\n${trip.shareUrl}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(trip.shareUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmail = async () => {
    if (!email.trim()) return;
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-calendar-invite', {
        body: {
          recipientEmail: email.trim(),
          tripName: trip.name,
          tripId: trip.id,
          events: trip.events,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setEmailSent(true);
        setEmail('');
        toast({ title: 'Email sent!', description: `Itinerary sent to ${email.trim()}` });
      } else throw new Error('Email service unavailable');
    } catch (e: any) {
      toast({ title: 'Failed to send', description: e.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 space-y-4 z-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Share plan</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{trip.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messenger buttons */}
        <div className="grid grid-cols-3 gap-3">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-green-600">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="text-[10px] font-medium text-green-700">WhatsApp</span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(trip.shareUrl)}&text=${encodeURIComponent(`Family plan: ${trip.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-sky-500">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span className="text-[10px] font-medium text-sky-600">Telegram</span>
          </a>

          <button
            onClick={copy}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            {copied
              ? <Check className="w-7 h-7 text-emerald-500" />
              : <Copy className="w-7 h-7 text-muted-foreground" />}
            <span className="text-[10px] font-medium text-muted-foreground">{copied ? 'Copied!' : 'Copy link'}</span>
          </button>
        </div>

        {/* URL preview */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">{trip.shareUrl}</p>
        </div>

        {/* Email section — hidden for kids */}
        {!hideEmail && (
          <div className="border-t pt-4 space-y-3">
            <div className="text-center">
              <p className="text-sm font-semibold flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4 text-primary" /> Send itinerary by email
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We'll send a nicely formatted plan to any inbox
              </p>
            </div>
            {emailSent ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <Check className="w-4 h-4 shrink-0" /> Itinerary sent! Check your inbox.
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="family@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendEmail()}
                  className="flex-1 h-9 text-sm"
                />
                <Button size="sm" onClick={sendEmail} disabled={sendingEmail || !email.trim()} className="shrink-0 gap-1.5">
                  {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4" /><span className="hidden sm:inline">Send</span></>}
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
