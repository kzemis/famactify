import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Target, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const totalSlides = 4;

  // Check if returning from demo flow
  useEffect(() => {
    const presentationMode = sessionStorage.getItem("presentationMode");
    if (presentationMode === "returning") {
      setCurrentSlide(2); // Go to pricing/GTM slide
      sessionStorage.removeItem("presentationMode");
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/");
      } else if (e.key === "ArrowRight" && currentSlide < totalSlides - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft" && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, navigate]);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const startDemo = () => {
    sessionStorage.setItem("presentationMode", "active");
    navigate("/onboarding/interests");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slide Container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          {/* Slide 1: Problem/Solution & Founders */}
          {currentSlide === 0 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <h1 className="text-5xl font-bold text-foreground text-center">
                The Problem
              </h1>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-primary">
                  According to data, Planning a Family Trip usually takes up to 8 Hours!
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Parents use <span className="text-primary font-semibold">Google, Instagram, TikTok, ChatGPT</span> etc. 
                  to collect information, verify details, and manually plan trips.
                </p>
              </div>

              <div className="border-t-2 border-primary pt-6 space-y-4">
                <h2 className="text-4xl font-bold text-primary">
                  Our Solution
                </h2>
                <p className="text-xl text-foreground leading-relaxed">
                  A simple AI tool that helps busy parents plan family activities in{" "}
                  <span className="text-primary font-semibold">seconds</span>, 
                  eliminating hours of planning.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-8 space-y-6">
                <h3 className="text-3xl font-semibold text-foreground">
                  The Founders
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-primary">Dainis Dulbinskis</h4>
                    <p className="text-muted-foreground">
                      2nd time founder, successful launch of marketplace ($250K+ revenue)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-primary">Kaspars Zemitis</h4>
                    <p className="text-muted-foreground">
                      8+ years in ticketing service development
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-primary">Kirill Luschin</h4>
                    <p className="text-muted-foreground">
                      AI specialist, the superhero!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 2: Interactive Demo */}
          {currentSlide === 1 && (
            <div className="space-y-12 animate-in fade-in duration-500 text-center">
              <div className="space-y-6">
                <Play className="h-24 w-24 mx-auto text-primary" />
                <h1 className="text-6xl font-bold text-foreground">
                  See It In Action
                </h1>
                <p className="text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  Experience how FamActify helps you plan family activities in seconds. 
                  Try our AI-powered questionnaire and see personalized recommendations.
                </p>
              </div>

              <Button 
                size="lg" 
                onClick={startDemo}
                className="text-xl px-12 py-8 h-auto"
              >
                <Play className="mr-3 h-6 w-6" />
                Start Live Demo
              </Button>

              <p className="text-muted-foreground">
                You'll return to this presentation after the demo
              </p>
            </div>
          )}

          {/* Slide 3: Pricing & GTM */}
          {currentSlide === 2 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <h1 className="text-5xl font-bold text-foreground">
                Pricing & Go-To-Market
              </h1>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Pricing */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-semibold text-primary flex items-center gap-3">
                    <Target className="h-8 w-8" />
                    Pricing
                  </h2>
                  
                  <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-primary">Free Plan</h3>
                    <p className="text-4xl font-bold text-foreground my-2">1 Trip</p>
                    <p className="text-muted-foreground">Basic planning features</p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-6">
                    <h3 className="text-2xl font-bold text-foreground">Family Plan</h3>
                    <p className="text-4xl font-bold text-primary my-2">
                      €3.99<span className="text-lg text-muted-foreground">/month</span>
                    </p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• 4 trips per month</li>
                      <li>• Calendar integration</li>
                      <li>• Family wishlist</li>
                    </ul>
                  </div>
                </div>

                {/* GTM */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-semibold text-primary flex items-center gap-3">
                    <Rocket className="h-8 w-8" />
                    Go-To-Market
                  </h2>
                  
                  <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-bold text-foreground">Grassroot Strategy</h3>
                    <p className="text-muted-foreground">
                      Target micro-influencers (busy moms/parents) via <span className="text-primary font-semibold">Modash platform</span> who 
                      talk about family values. Offer free trial in exchange for authentic reviews.
                    </p>
                    <div className="pt-3 border-t border-border">
                      <p className="text-sm font-semibold text-foreground mb-2">Target Audience:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Busy parents and moms</li>
                        <li>• Family content creators</li>
                        <li>• Parenting community voices</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 4: Milestones & Goal */}
          {currentSlide === 3 && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <h1 className="text-5xl font-bold text-foreground">
                Traction & Roadmap
              </h1>

              <div className="grid gap-4">
                {[
                  "Launch in Latvia and refine product",
                  "Acquire first 100 customers",
                  "Raise pre-seed funding",
                  "Expand to Baltics",
                  "Build GTM strategy for Europe"
                ].map((milestone, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-4 bg-muted/50 rounded-lg p-5"
                  >
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {index + 1}
                    </div>
                    <span className="text-xl text-foreground">{milestone}</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-primary pt-8 text-center space-y-4">
                <h2 className="text-4xl font-bold text-primary">
                  Our Goal
                </h2>
                <p className="text-2xl text-foreground max-w-3xl mx-auto leading-relaxed">
                  Make a simple and smart platform to help families{" "}
                  <span className="text-primary font-semibold">focus on the family time</span>, 
                  not planning it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="border-t border-border bg-card/50">
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide
                    ? "bg-primary w-8"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="lg"
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Close Button */}
      <div className="absolute top-8 right-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close presentation"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default PitchDeck;
