import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const TestAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log("🔵 TestAuth component mounted");
    console.log("🔵 Current URL:", window.location.href);
    console.log("🔵 URL params:", window.location.search);
    
    // Check current session
    console.log("🔍 Checking for existing session...");
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("❌ Error getting session:", error);
      } else if (session) {
        console.log("✅ Found existing session:", {
          user_id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider,
        });
        setUser(session.user);
      } else {
        console.log("ℹ️ No existing session found");
      }
    });

    // Listen for auth changes
    console.log("👂 Setting up auth state listener...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Auth state change event:", event);
      console.log("🔔 Session data:", session ? {
        user_id: session.user.id,
        email: session.user.email,
        provider: session.user.app_metadata?.provider,
        expires_at: new Date(session.expires_at! * 1000).toLocaleString(),
      } : "No session");
      
      setUser(session?.user ?? null);
      
      if (event === "SIGNED_IN") {
        console.log("✅ User successfully signed in");
        toast({
          title: "Success!",
          description: "Successfully signed in with Google",
        });
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
      } else if (event === "TOKEN_REFRESHED") {
        console.log("🔄 Token refreshed");
      } else if (event === "USER_UPDATED") {
        console.log("🔄 User data updated");
      }
    });

    return () => {
      console.log("🔴 TestAuth component unmounting, cleaning up listener");
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleGoogleSignIn = async () => {
    try {
      console.log("🚀 Initiating Google sign-in...");
      setLoading(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/test-auth`;
      console.log("🔗 Redirect URL:", redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("❌ OAuth error:", error);
        console.error("❌ Error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        setError(error.message);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("✅ OAuth initiated successfully");
        console.log("✅ OAuth data:", data);
      }
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    console.log("👋 Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Sign out error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      console.log("✅ Successfully signed out");
      setUser(null);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Google Login Test</CardTitle>
          <CardDescription>Test page for Google OAuth authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {user ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Signed in as:</strong>
                  <br />
                  {user.email}
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Provider:</strong> {user.app_metadata?.provider}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
              </div>

              <Button onClick={handleSignOut} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Loading..." : "Sign in with Google"}
            </Button>
          )}

          <div className="text-sm text-muted-foreground text-center pt-4">
            Navigate directly to: <code>/test-auth</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAuth;
