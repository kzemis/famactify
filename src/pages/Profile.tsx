import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ---------------------------------------------------------------------------
// Interests vocabulary (subset of TAGS_VOCABULARY)
// ---------------------------------------------------------------------------
const CHILD_INTERESTS = [
  'animals', 'science', 'art', 'music', 'cooking',
  'water', 'climbing', 'sports', 'trains', 'dinosaurs', 'space', 'building',
] as const;

const FAMILY_INTERESTS = [
  'nature', 'culture', 'sport', 'education', 'music', 'art',
  'food', 'adventure', 'community', 'animals', 'science', 'history',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Child {
  age: number;
  name: string;
  interests: string[];
}

interface AddChildForm {
  age: string;
  name: string;
  interests: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    city: "",
    family_size: "",
    children_ages: "", // kept for backward compat
    bio: "",
    discoverable: false,
  });
  const [children, setChildren] = useState<Child[]>([]);
  const [familyInterests, setFamilyInterests] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState("");

  // Add-child inline form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [addChildForm, setAddChildForm] = useState<AddChildForm>({ age: '', name: '', interests: [] });

  const navigate = useNavigate();
  const { toast } = useToast();

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const getProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUserEmail(session.user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          city: data.city || "",
          family_size: data.family_size?.toString() || "",
          children_ages: data.children_ages || "",
          bio: data.bio || "",
          discoverable: data.discoverable || false,
        });
        setChildren((data as any).children || []);
        setFamilyInterests((data as any).interests || []);
      }

      setLoading(false);
    };

    getProfile();
  }, [navigate, toast]);

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    // Backward compat: derive children_ages from structured children array
    const derivedChildrenAges = children.map(c => c.age).join(', ');

    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: session.user.id,
        full_name: profile.full_name || null,
        city: profile.city || null,
        family_size: profile.family_size ? parseInt(profile.family_size) : null,
        children_ages: derivedChildrenAges || profile.children_ages || null,
        bio: profile.bio || null,
        discoverable: profile.discoverable,
        children: children as any,
        interests: familyInterests,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile saved successfully",
      });
    }

    setSaving(false);
  };

  // ---------------------------------------------------------------------------
  // Child helpers
  // ---------------------------------------------------------------------------
  const toggleChildInterest = (interest: string) => {
    setAddChildForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const confirmAddChild = () => {
    const age = parseInt(addChildForm.age);
    if (isNaN(age) || age < 1 || age > 17) {
      toast({ title: "Invalid age", description: "Age must be between 1 and 17", variant: "destructive" });
      return;
    }
    setChildren(prev => [...prev, { age, name: addChildForm.name.trim(), interests: addChildForm.interests }]);
    setAddChildForm({ age: '', name: '', interests: [] });
    setShowAddChild(false);
  };

  const removeChild = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  const toggleFamilyInterest = (interest: string) => {
    setFamilyInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <AppHeader />
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      <div className="relative flex-1 max-w-2xl mx-auto p-4 pt-8 w-full">
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Your Profile</CardTitle>
                <CardDescription>{userEmail}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Jānis Bērziņš"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Rīga"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="family_size">Family Size</Label>
              <Input
                id="family_size"
                type="number"
                placeholder="4"
                value={profile.family_size}
                onChange={(e) => setProfile({ ...profile, family_size: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About Your Family</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about your family's interests and preferences..."
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="discoverable" className="text-base font-semibold">
                  Discoverable Profile
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow other users to find and invite you when planning trips
                </p>
              </div>
              <Switch
                id="discoverable"
                checked={profile.discoverable}
                onCheckedChange={(checked) => setProfile({ ...profile, discoverable: checked })}
              />
            </div>

            {/* ── Children builder (PLN-06) ── */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Children</Label>

              {/* Existing children */}
              {children.length > 0 && (
                <div className="space-y-2">
                  {children.map((child, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-sm">Age {child.age}</Badge>
                          {child.name && (
                            <span className="text-sm font-medium">{child.name}</span>
                          )}
                        </div>
                        {child.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {child.interests.map(interest => (
                              <Badge key={interest} variant="outline" className="text-xs">{interest}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeChild(idx)}
                        className="text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                        aria-label="Remove child"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add child inline form */}
              {showAddChild ? (
                <div className="border rounded-lg p-4 space-y-3 bg-card">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="child_age" className="text-sm">Age (1–17) *</Label>
                      <Input
                        id="child_age"
                        type="number"
                        min={1}
                        max={17}
                        placeholder="5"
                        value={addChildForm.age}
                        onChange={(e) => setAddChildForm(prev => ({ ...prev, age: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="child_name" className="text-sm">Name (optional)</Label>
                      <Input
                        id="child_name"
                        placeholder="Alex"
                        value={addChildForm.name}
                        onChange={(e) => setAddChildForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Interests</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CHILD_INTERESTS.map(interest => (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleChildInterest(interest)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            addChildForm.interests.includes(interest)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50'
                          }`}
                        >
                          {interest}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmAddChild}>Add child</Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowAddChild(false);
                        setAddChildForm({ age: '', name: '', interests: [] });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowAddChild(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add a child
                </Button>
              )}
            </div>

            {/* ── Family interests (PLN-06) ── */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Family Interests</Label>
              <p className="text-sm text-muted-foreground">What does your family enjoy?</p>
              <div className="flex flex-wrap gap-1.5">
                {FAMILY_INTERESTS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleFamilyInterest(interest)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      familyInterests.includes(interest)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {familyInterests.length > 0 && (
                <p className="text-xs text-muted-foreground">{familyInterests.length} selected</p>
              )}
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              className="w-full gap-2"
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
