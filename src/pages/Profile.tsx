import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Save } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    city: "",
    family_size: "",
    children_ages: "",
    bio: "",
  });
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

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
        });
      }

      setLoading(false);
    };

    getProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    setSaving(true);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: session.user.id,
        full_name: profile.full_name || null,
        city: profile.city || null,
        family_size: profile.family_size ? parseInt(profile.family_size) : null,
        children_ages: profile.children_ages || null,
        bio: profile.bio || null,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AppHeader />
      <div 
        className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/5 via-background to-accent/5"
      />
      
      <div className="relative max-w-2xl mx-auto p-4 pt-8">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="children_ages">Children's Ages</Label>
                <Input
                  id="children_ages"
                  placeholder="e.g., 5, 8, 12"
                  value={profile.children_ages}
                  onChange={(e) => setProfile({ ...profile, children_ages: e.target.value })}
                />
              </div>
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
    </div>
  );
};

export default Profile;
