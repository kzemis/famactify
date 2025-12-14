import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Calendar, Sparkles, Users, Heart, Search, X, MessageSquare, User, LogOut, CalendarPlus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-family.jpg";
import Footer from "@/components/Footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

const Landing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t.common.signOut,
        description: "You have been signed out successfully",
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: t.common.error,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: t.landing.aiDiscovery,
      description: t.landing.aiDiscoveryDesc
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: t.landing.smartPlanning,
      description: t.landing.smartPlanningDesc
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: t.landing.familyFriendly,
      description: t.landing.familyFriendlyDesc
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: t.landing.localEvents,
      description: t.landing.localEventsDesc
    }
  ];

  const plans = [
    {
      name: t.landing.free,
      price: "€0",
      period: t.landing.forever,
      features: [
        t.landing.plan1TripFree,
        t.landing.basicPlanningFeatures,
        t.landing.tryBeforeYouBuy
      ]
    },
    {
      name: t.landing.family,
      price: "€3.99",
      period: t.landing.perMonth,
      features: [
        t.landing.planUpTo4Trips,
        t.landing.createWishlists,
        t.landing.calendarIntegration,
        t.landing.customerSupport
      ],
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <span className="text-2xl font-bold text-primary">FamActify</span>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Activities button linking to community page */}
            <Button variant="ghost" onClick={() => navigate("/community")} className="sm:w-auto sm:px-4">
              Activities
            </Button>
            
            <Button variant="outline" onClick={() => navigate("/contribute")} size="icon" className="sm:w-auto sm:px-4">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t.common.contribute}</span>
            </Button>

            <LanguageSwitcher />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.user_metadata?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    {t.header.profileSettings}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/saved-trips")}>
                    {t.header.savedTrips}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    {t.common.signOut}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                onClick={handleGoogleSignIn}
                size="icon"
                className="sm:w-auto sm:px-4"
              >
                <User className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t.common.signIn}</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="container relative mx-auto px-4 py-8 md:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-8">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                {t.landing.makingFamilyTimeEasy}
              </div>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                {t.landing.heroTitle}{" "}
                <span className="text-primary">FamActify</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                {t.landing.heroSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Replace Get Started Free with Activity catalog linking to community */}
                <Button
                  size="lg" 
                  onClick={() => navigate("/community")}
                  className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  Activity catalog
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/contribute")}
                  className="text-lg px-8 py-6 rounded-2xl"
                >
                  {t.common.contribute}
                </Button>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/30 rounded-3xl blur-3xl" />
              <img 
                src={heroImage} 
                alt="Happy family enjoying activities together"
                className="relative rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.whyParentsLove}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.landing.whyParentsLoveSubtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {features.map((feature, idx) => (
              <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why FamActify Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.whyChoose}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t.landing.whyChooseSubtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {/* Manual Search */}
            <Card className="p-6 border-muted">
              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">{t.landing.manualSearch}</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.hoursOfBrowsing}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.noPersonalization}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.manualScheduling}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.outdatedInfo}</span>
                </li>
              </ul>
            </Card>

            {/* FamActify - Best Choice */}
            <Card className="p-8 border-primary border-2 shadow-2xl relative scale-105 -my-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                {t.landing.bestChoice}
              </div>
              <div className="text-center mb-6">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-primary">FamActify</h3>
              </div>
              <ul className="space-y-4 text-base">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t.landing.realLocalEvents}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t.landing.personalizedInterests}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t.landing.autoItineraries}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>{t.landing.saveShareExport}</span>
                </li>
              </ul>
            </Card>

            {/* ChatGPT */}
            <Card className="p-6 border-muted">
              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">ChatGPT</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.genericSuggestions}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.noRealTimeAvail}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.cannotSaveShare}</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">{t.landing.noCalendarIntegration}</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t.landing.choosePlan}</h2>
            <p className="text-xl text-muted-foreground">
              {t.landing.choosePlanSubtitle}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`p-8 relative transition-transform ${plan.popular ? 'border-primary border-2 shadow-2xl scale-105 md:scale-110 py-12 z-10' : ''}`}
              >
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate("/onboarding/interests")}
                >
                  {plan.price === "€0" ? t.landing.startFree : t.landing.getStarted}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="hidden py-24 bg-gradient-to-b from-background via-primary/10 to-accent/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Family Time?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of families who've discovered stress-free planning
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/onboarding/interests")}
            className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
            Start Planning Now
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
