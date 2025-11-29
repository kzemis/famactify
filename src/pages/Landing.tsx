import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Calendar, Sparkles, Users, Heart, Search, X, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-family.jpg";
import Footer from "@/components/Footer";

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "AI-Powered Discovery",
      description: "Get personalized event recommendations based on your family's unique interests"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Smart Planning",
      description: "Automatically organize activities to avoid conflicts and maximize fun"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Family-Friendly",
      description: "Share itineraries with all family members in just one tap"
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Local Events",
      description: "Discover amazing activities happening in your area right now"
    }
  ];

  const plans = [
    {
      name: "Free",
      price: "€0",
      period: "forever",
      features: [
        "Plan 1 trip for free",
        "Basic planning features",
        "Try before you buy"
      ]
    },
    {
      name: "Family",
      price: "€3.99",
      period: "per month",
      features: [
        "Plan up to 4 trips per month",
        "Create wishlists with relatives",
        "Calendar integration",
        "Customer support"
      ],
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <span className="text-2xl font-bold text-primary">famactify</span>
          <Button variant="outline" onClick={() => navigate("/home")}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="container relative mx-auto px-4 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-8">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                Making Family Time Easy
              </div>
              <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                Plan Your Family Holidays with{" "}
                <span className="text-primary">Famactify</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Stop spending hours searching for family activities. Let AI discover perfect events that match your interests, automatically plan your days, and create unforgettable memories.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                  size="lg" 
                  onClick={() => navigate("/home")}
                  className="text-lg px-8 py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started Free
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6 rounded-2xl"
                >
                  See How It Works
                </Button>
              </div>
            </div>
            <div className="relative">
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
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Busy Parents Love Famactify</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We understand the challenge of planning quality family time. That's why we built the ultimate solution.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* Why Famactify Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Famactify?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how we compare to other ways of planning family activities
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Manual Search */}
            <Card className="p-6 border-muted">
              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Manual Search</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">Hours of browsing multiple websites</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">No personalization for your family</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">Manual scheduling and conflict checking</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">Outdated or incomplete information</span>
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
                  <span className="text-muted-foreground">Generic suggestions, not local events</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">No real-time availability or pricing</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">Cannot save or share itineraries</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <span className="text-muted-foreground">No calendar integration</span>
                </li>
              </ul>
            </Card>

            {/* Famactify */}
            <Card className="p-6 border-primary border-2 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                Best Choice
              </div>
              <div className="text-center mb-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-primary">Famactify</h3>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Real local events updated in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Personalized to your family's interests</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Auto-generated conflict-free itineraries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>Save, share, and export to calendar</span>
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
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you're ready
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-center">
            {plans.map((plan, idx) => (
              <Card 
                key={idx} 
                className={`p-8 relative transition-transform ${plan.popular ? 'border-primary border-2 shadow-2xl scale-105 md:scale-110 py-12 z-10' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}
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
                  onClick={() => navigate("/home")}
                >
                  {plan.price === "€0" ? "Start Free" : "Get Started"}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/20 via-background to-accent/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Family Time?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of families who've discovered stress-free planning
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/home")}
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
