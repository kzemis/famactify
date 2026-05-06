import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Plus, X, LogOut, ChevronRight, BookMarked, CalendarDays, Settings, Stamp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { profileService, authService } from "@/services";
import { badgesService } from "@/services/badgesService";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCountry, COUNTRIES, type CountryCode } from "@/i18n/CountryContext";
import { useFamilyMode } from "@/contexts/FamilyModeContext";
import type { EarnedBadge } from "@/types/hunt";

const CHILD_INTERESTS = ['animals', 'science', 'art', 'music', 'cooking', 'water', 'climbing', 'sports', 'trains', 'dinosaurs', 'space', 'building'] as const;
const FAMILY_INTERESTS = ['nature', 'culture', 'sport', 'education', 'music', 'art', 'food', 'adventure', 'community', 'animals', 'science', 'history'] as const;

interface Child { age: number; name: string; interests: string[]; }
interface AddChildForm { age: string; name: string; interests: string[]; }

const BADGE_TIER_STYLES: Record<EarnedBadge['tier'], string> = {
  bronze: 'bg-orange-100 text-orange-800 border-orange-200',
  silver: 'bg-slate-100 text-slate-800 border-slate-200',
  gold: 'bg-amber-100 text-amber-800 border-amber-200',
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'menu' | 'profile' | 'children' | 'interests' | 'settings' | 'badges'>('menu');
  const { language, setLanguage } = useLanguage();
  const { country, setCountry } = useCountry();
  const [profile, setProfile] = useState({ full_name: "", city: "", family_size: "", children_ages: "", bio: "", discoverable: false });
  const [children, setChildren] = useState<Child[]>([]);
  const [familyInterests, setFamilyInterests] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [showAddChild, setShowAddChild] = useState(false);
  const [addChildForm, setAddChildForm] = useState<AddChildForm>({ age: '', name: '', interests: [] });
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const { currentProfile } = useFamilyMode();
  const navigate = useNavigate();
  const { toast } = useToast();
  const badgeProfileId = currentProfile?.id ?? 'parent-default';

  useEffect(() => {
    (async () => {
      const { profile: data, email } = await profileService.getCurrentProfile();
      if (!data && !email) { navigate("/auth"); return; }
      setUserEmail(email);
      if (data) {
        setProfile({ full_name: data.full_name || "", city: data.city || "", family_size: data.family_size?.toString() || "", children_ages: data.children_ages || "", bio: data.bio || "", discoverable: data.discoverable || false });
        setChildren((data as any).children || []);
        setFamilyInterests((data as any).interests || []);
      }
      setLoading(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (activeSection !== 'badges') return;
    let cancelled = false;
    setBadgesLoading(true);
    badgesService.listEarned(badgeProfileId)
      .then(list => {
        if (!cancelled) setBadges(list);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      })
      .finally(() => {
        if (!cancelled) setBadgesLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeSection, badgeProfileId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const derivedChildrenAges = children.map(c => c.age).join(', ');
      await profileService.saveCurrentProfile({ full_name: profile.full_name || null, city: profile.city || null, family_size: profile.family_size ? parseInt(profile.family_size) : null, children_ages: derivedChildrenAges || profile.children_ages || null, bio: profile.bio || null, discoverable: profile.discoverable, children: children as any, interests: familyInterests });
      toast({ title: "Profile saved" });
      setActiveSection('menu');
    } catch {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleChildInterest = (interest: string) =>
    setAddChildForm(prev => ({ ...prev, interests: prev.interests.includes(interest) ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest] }));

  const confirmAddChild = () => {
    const age = parseInt(addChildForm.age);
    if (isNaN(age) || age < 1 || age > 17) { toast({ title: "Age must be 1–17", variant: "destructive" }); return; }
    setChildren(prev => [...prev, { age, name: addChildForm.name.trim(), interests: addChildForm.interests }]);
    setAddChildForm({ age: '', name: '', interests: [] });
    setShowAddChild(false);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* ── Menu view ── */}
      {activeSection === 'menu' && (
        <>
          {/* Profile hero — compact one-row */}
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base truncate">{profile.full_name || 'Your Profile'}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              {profile.city && <p className="text-xs text-muted-foreground truncate">📍 {profile.city}</p>}
            </div>
          </div>

          {/* Menu sections */}
          <div className="px-4 space-y-3 pb-tab-bar">
            {/* Account section */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <button onClick={() => setActiveSection('profile')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Personal Info</p>
                  <p className="text-xs text-muted-foreground">Name, city, bio</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => setActiveSection('children')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <span className="text-base">👶</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Children</p>
                  <p className="text-xs text-muted-foreground">{children.length > 0 ? `${children.length} added` : 'Add your kids'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => setActiveSection('interests')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                  <span className="text-base">❤️</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Family Interests</p>
                  <p className="text-xs text-muted-foreground">{familyInterests.length > 0 ? `${familyInterests.length} selected` : 'What you enjoy'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <button onClick={() => setActiveSection('settings')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Region & Language</p>
                  <p className="text-xs text-muted-foreground">{COUNTRIES[country.code].flag} {country.name} · {language.toUpperCase()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => navigate('/saved-trips')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <BookMarked className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Saved Trips</p>
                  <p className="text-xs text-muted-foreground">Your planned adventures</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => navigate('/passport')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Stamp className="w-4 h-4 text-amber-700" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Explorer Passport</p>
                  <p className="text-xs text-muted-foreground">Stamps, progression & printable</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => navigate('/chores')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-lg leading-none">🏠</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Home Chores</p>
                  <p className="text-xs text-muted-foreground">Hidden chore hunts your kids earn stamps from</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => setActiveSection('badges')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-lg leading-none">🎖️</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Badges</p>
                  <p className="text-xs text-muted-foreground">Hunt completion collection</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="border-t" />
              <button onClick={() => navigate('/plan')} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">Session Planner</p>
                  <p className="text-xs text-muted-foreground">Plan your next outing</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Sign out */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-4 tap-highlight active:bg-muted/50 transition-colors text-destructive">
                <div className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-sm font-semibold">Sign Out</p>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Personal Info section ── */}
      {activeSection === 'profile' && (
        <>
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-4 flex items-center gap-3">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold flex-1">Personal Info</h2>
            <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="px-4 py-4 pb-tab-bar space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-semibold">Full Name</Label>
              <Input id="full_name" placeholder="Your name" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-semibold">City</Label>
              <Input id="city" placeholder="Your city" value={profile.city} onChange={e => setProfile({ ...profile, city: e.target.value })} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="family_size" className="text-sm font-semibold">Family Size</Label>
              <Input id="family_size" type="number" placeholder="4" value={profile.family_size} onChange={e => setProfile({ ...profile, family_size: e.target.value })} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-semibold">About Your Family</Label>
              <Textarea id="bio" placeholder="Tell us about your family…" value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-2xl bg-card">
              <div>
                <p className="text-sm font-semibold">Discoverable Profile</p>
                <p className="text-xs text-muted-foreground mt-0.5">Let others find you when planning trips</p>
              </div>
              <Switch checked={profile.discoverable} onCheckedChange={checked => setProfile({ ...profile, discoverable: checked })} />
            </div>
          </div>
        </>
      )}

      {/* ── Children section ── */}
      {activeSection === 'children' && (
        <>
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-4 flex items-center gap-3">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold flex-1">Children</h2>
            <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="px-4 py-4 pb-tab-bar space-y-3">
            {children.map((child, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full">Age {child.age}</span>
                    {child.name && <span className="text-sm font-medium">{child.name}</span>}
                  </div>
                  {child.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {child.interests.map(interest => (
                        <span key={interest} className="text-xs px-2 py-0.5 bg-muted rounded-full">{interest}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setChildren(prev => prev.filter((_, i) => i !== idx))} className="w-8 h-8 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive tap-highlight">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {showAddChild ? (
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Age (1–17) *</Label>
                    <Input type="number" min={1} max={17} placeholder="5" value={addChildForm.age} onChange={e => setAddChildForm(prev => ({ ...prev, age: e.target.value }))} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Name (optional)</Label>
                    <Input placeholder="Alex" value={addChildForm.name} onChange={e => setAddChildForm(prev => ({ ...prev, name: e.target.value }))} className="h-11 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Interests</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {CHILD_INTERESTS.map(interest => (
                      <button key={interest} type="button" onClick={() => toggleChildInterest(interest)}
                        className={cn('h-8 px-3 rounded-full text-xs font-medium transition-colors tap-highlight',
                          addChildForm.interests.includes(interest) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={confirmAddChild} className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold tap-highlight">Add</button>
                  <button onClick={() => { setShowAddChild(false); setAddChildForm({ age: '', name: '', interests: [] }); }} className="flex-1 h-11 rounded-2xl border border-border text-sm font-medium tap-highlight">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddChild(true)} className="w-full h-12 rounded-2xl border border-dashed border-border flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground tap-highlight">
                <Plus className="w-4 h-4" /> Add a child
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Settings section ── */}
      {activeSection === 'settings' && (
        <>
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-4 flex items-center gap-3">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold flex-1">Region & Language</h2>
          </div>
          <div className="px-4 py-4 pb-tab-bar space-y-6">
            {/* Language */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Language</p>
              <div className="grid grid-cols-2 gap-2">
                {(['en', 'lv'] as const).map(lang => (
                  <button key={lang} onClick={() => setLanguage(lang)}
                    className={cn('h-12 rounded-2xl border-2 text-sm font-semibold transition-colors tap-highlight',
                      language === lang ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                    {lang === 'en' ? '🇺🇸 English' : '🇱🇻 Latviešu'}
                  </button>
                ))}
              </div>
            </div>
            {/* Region */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Region</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(COUNTRIES) as CountryCode[]).map(code => (
                  <button key={code} onClick={() => setCountry(code)}
                    className={cn('h-12 rounded-2xl border-2 text-sm font-semibold transition-colors tap-highlight',
                      country.code === code ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>
                    {COUNTRIES[code].flag} {COUNTRIES[code].name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Affects currency, distances and date formats.
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Interests section ── */}
      {activeSection === 'interests' && (
        <>
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-4 flex items-center gap-3">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold flex-1">Family Interests</h2>
            <button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <div className="px-4 py-4 pb-tab-bar space-y-3">
            <p className="text-sm text-muted-foreground">What does your family enjoy? We'll use this to suggest activities.</p>
            <div className="flex flex-wrap gap-2">
              {FAMILY_INTERESTS.map(interest => (
                <button key={interest} type="button"
                  onClick={() => setFamilyInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])}
                  className={cn('h-10 px-4 rounded-full text-sm font-medium transition-colors tap-highlight',
                    familyInterests.includes(interest) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  {interest}
                </button>
              ))}
            </div>
            {familyInterests.length > 0 && (
              <p className="text-xs text-muted-foreground">{familyInterests.length} selected</p>
            )}
          </div>
        </>
      )}

      {/* ── Badges section ── */}
      {activeSection === 'badges' && (
        <>
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-4 flex items-center gap-3">
            <button onClick={() => setActiveSection('menu')} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted tap-highlight">
              <X className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight">Badges</h2>
              <p className="text-xs text-muted-foreground truncate">{currentProfile?.emoji ?? '👨‍👩‍👧'} {currentProfile?.name ?? 'Parent'} hunt collection</p>
            </div>
          </div>
          <div className="px-4 py-4 pb-tab-bar space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-pink-50 border p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Scavenger Hunt Badges</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Complete hunts to collect city and venue memories. Badge tiers reflect how many stops were solved without skips.
              </p>
              <button onClick={() => navigate('/hunts')} className="mt-3 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold tap-highlight">
                Find a hunt
              </button>
            </div>

            {badgesLoading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : badges.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-5xl">🎖️</span>
                <p className="font-semibold">No badges yet</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Start a scavenger hunt, finish the stops, and your first badge will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {badges.map(badge => (
                  <button
                    key={`${badge.huntId}-${badge.earnedAt}`}
                    onClick={() => navigate(`/hunts/${badge.huntSlug}`)}
                    className="w-full text-left rounded-2xl border bg-card p-4 flex items-center gap-3 tap-highlight active:scale-[0.99] transition-transform"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-amber-100 flex items-center justify-center text-3xl shrink-0">
                      {badge.coverEmoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{badge.huntTitle}</p>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase shrink-0', BADGE_TIER_STYLES[badge.tier])}>
                          {badge.tier}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{badge.city} · {badge.stopsCompleted}/{badge.totalStops} stops</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Earned {new Date(badge.earnedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;
