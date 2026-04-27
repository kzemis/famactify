/**
 * OrgSetup — Register or update your organization profile.
 * Any authenticated user can register as an organization (municipality or partner).
 * After saving, redirects to /org/dashboard.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, ArrowLeft, Globe, Image, CheckCircle2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import Footer from '@/components/Footer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrgType = 'municipality' | 'partner';

interface OrgProfile {
  id: string;
  user_id: string;
  org_name: string;
  org_type: OrgType;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  verified: boolean;
}

const ORG_TYPE_OPTIONS: { value: OrgType; label: string; desc: string; emoji: string }[] = [
  {
    value: 'municipality',
    label: 'Municipality / Government',
    desc: 'City, town, district, or public authority',
    emoji: '🏛️',
  },
  {
    value: 'partner',
    label: 'Partner Organization',
    desc: 'Business, NGO, museum, or community group',
    emoji: '🤝',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function OrgSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [existing, setExisting] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [orgType, setOrgType] = useState<OrgType>('partner');
  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUser(user);

      const { data } = await (supabase as any)
        .from('org_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setExisting(data);
        setOrgType(data.org_type);
        setOrgName(data.org_name);
        setDescription(data.description || '');
        setWebsiteUrl(data.website_url || '');
        setLogoUrl(data.logo_url || '');
      }
      setLoading(false);
    };
    init();
  }, []);

  const save = async () => {
    if (!orgName.trim()) { toast.error('Organization name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        org_name: orgName.trim(),
        org_type: orgType,
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from('org_profiles')
          .update(payload)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Organization profile updated');
      } else {
        const { error } = await (supabase as any)
          .from('org_profiles')
          .insert({ ...payload, user_id: user.id });
        if (error) throw error;
        toast.success('Organization registered! You can now create curated lists.');
      }
      navigate('/org/dashboard');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8 max-w-2xl animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Page header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/org/dashboard')} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              {existing ? 'Edit Organization Profile' : 'Register Your Organization'}
            </h1>
            {!existing && (
              <p className="text-muted-foreground text-sm mt-1">
                Create an org profile to publish curated activity collections for families.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Organization type */}
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Organization type
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORG_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setOrgType(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    orgType === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <span className="text-2xl leading-none mt-0.5">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                  {orgType === opt.value && (
                    <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 border rounded-xl bg-card space-y-4">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Details
            </h2>

            <div>
              <Label htmlFor="org-name">Organization name *</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Riga City Parks Department"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Short description</Label>
              <Input
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="We curate family activities across Riga."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="website">Website URL</Label>
              <div className="relative mt-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="website"
                  value={websiteUrl}
                  onChange={e => setWebsiteUrl(e.target.value)}
                  placeholder="https://parks.riga.lv"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="logo">Logo URL</Label>
              <div className="relative mt-1">
                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="pl-9"
                />
              </div>
              {logoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="w-10 h-10 rounded-md object-contain border bg-white p-0.5"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <p className="text-xs text-muted-foreground">Preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Verified badge (read-only display) */}
          {existing?.verified && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
              <span>✅</span>
              <span>Your organization is verified.</span>
            </div>
          )}

          {/* What happens next info (new registrations) */}
          {!existing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 space-y-1">
              <p className="font-semibold">What happens after registration?</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                <li>You can immediately create and publish curated activity lists</li>
                <li>Your org name and logo appear on every list you publish</li>
                <li>Verification badge is granted manually by the FamActify team</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pb-4">
            <Button variant="outline" onClick={() => navigate('/org/dashboard')}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !orgName.trim()}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Register organization'}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
