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
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      setUser(session?.user ?? null);
      
      if (event === "SIGNED_IN") {
        toast({
          title: "Success!",
          description: "Successfully signed in with Google",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/test-auth`,
        },
      });

      if (error) {
        setError(error.message);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
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
