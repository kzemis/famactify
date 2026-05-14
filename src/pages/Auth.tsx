import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";
import { Mail, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import patternBg from "@/assets/pattern-bg.jpg";

type Mode = "signin" | "signup" | "signup-confirm-sent" | "reset-request" | "reset-link-sent";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const Auth = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle both SIGNED_IN (email/password) and INITIAL_SESSION (Google OAuth — Supabase
      // may process the hash before our listener subscribes and surfaces it as INITIAL_SESSION).
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        const params = new URLSearchParams(location.search);
        const next = params.get('next');
        // Only allow internal paths — prevent open-redirect to external URLs.
        const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/activities';
        navigate(safeNext);
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, location.search]);

  const handleGoogleSignIn = async () => {
    try {
      // Redirect back to /auth (not /home) so the SIGNED_IN listener on this page
      // can process the session. /home → <Navigate replace> strips the OAuth hash
      // before Supabase can read it, so the session is never established.
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not sign in with Google",
        variant: "destructive",
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange SIGNED_IN listener handles navigation
    } catch (error: unknown) {
      toast({
        title: "Sign in failed",
        description: error instanceof Error ? error.message : "Could not sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // Redirect to /auth so the onAuthStateChange SIGNED_IN listener can
        // process the session from the URL hash and navigate to /activities.
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;

      if (data.session) {
        // Email confirmation is OFF — user is already signed in.
        // onAuthStateChange SIGNED_IN listener will navigate to /activities.
        toast({ title: "Welcome to FamActify!" });
      } else {
        // Email confirmation is ON — user must click the link in their email.
        setSubmittedEmail(email);
        setMode("signup-confirm-sent");
        toast({
          title: "Check your email",
          description: `We sent a confirmation link to ${email}`,
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Could not create account",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!submittedEmail) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: submittedEmail });
      if (error) throw error;
      toast({ title: "Email re-sent", description: "Check your inbox." });
    } catch (error: unknown) {
      toast({
        title: "Could not resend email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSubmittedEmail(email);
      setMode("reset-link-sent");
    } catch (error: unknown) {
      toast({
        title: "Could not send reset email",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardContent = () => {
    if (mode === "signup-confirm-sent") {
      return (
        <>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center md:text-3xl">Check your email</CardTitle>
            <CardDescription className="text-center text-sm md:text-base">
              We sent a confirmation link to <strong>{submittedEmail}</strong>. Click it to activate your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              className="w-full min-h-[44px]"
              variant="outline"
              disabled={loading}
              onClick={handleResendConfirmation}
            >
              {loading ? "Sending..." : "Resend email"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
            </div>
          </CardContent>
        </>
      );
    }

    if (mode === "reset-link-sent") {
      return (
        <>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center md:text-3xl">Check your email</CardTitle>
            <CardDescription className="text-center text-sm md:text-base">
              We sent a password-reset link to <strong>{submittedEmail}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          </CardContent>
        </>
      );
    }

    if (mode === "reset-request") {
      return (
        <>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center md:text-3xl">Reset password</CardTitle>
            <CardDescription className="text-center text-sm md:text-base">
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 min-h-[44px]"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          </CardContent>
        </>
      );
    }

    // signin and signup modes share the form structure
    const isSignUp = mode === "signup";
    return (
      <>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center md:text-3xl">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription className="text-center text-sm md:text-base">
            {isSignUp
              ? "Sign up to start planning amazing family activities"
              : "Sign in to continue planning amazing family activities"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 min-h-[44px]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-2 hover:underline hover:text-primary"
                    onClick={() => setMode("reset-request")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 min-h-[44px]"
                />
              </div>
            </div>
            <Button type="submit" className="w-full min-h-[44px]" disabled={loading}>
              {loading
                ? (isSignUp ? "Creating Account..." : "Signing In...")
                : (isSignUp ? "Create Account" : "Sign In")}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => setMode(isSignUp ? "signin" : "signup")}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Sign in with Google
          </Button>

          <button
            type="button"
            onClick={() => navigate('/activities')}
            className="w-full text-sm text-muted-foreground hover:text-primary mt-2"
          >
            Continue browsing without an account
          </button>
        </CardContent>
      </>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <span
            className="text-2xl font-bold text-primary cursor-pointer"
            onClick={() => navigate("/")}
          >
            FamActify
          </span>
        </div>
      </header>
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <Card className="w-full max-w-md relative shadow-2xl">
          {cardContent()}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
