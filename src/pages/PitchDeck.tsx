import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentSlide < totalSlides - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === "ArrowLeft" && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slide Container */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          {/* Slide 1: Problem/Solution */}
          {currentSlide === 0 && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="space-y-6">
                <h1 className="text-5xl font-bold text-foreground">
                  The Problem
                </h1>
                <p className="text-3xl text-muted-foreground leading-relaxed">
                  Planning a family trip for a weekend can take up to{" "}
                  <span className="text-primary font-semibold">8 hours</span>.
                </p>
                <p className="text-2xl text-muted-foreground leading-relaxed">
                  Parents typically use multiple platforms - Google, Facebook, Instagram, 
                  TikTok, ChatGPT, etc. to collect all the information, then they must 
                  verify the information and plan and manage the trip on their own.
                </p>
              </div>

              <div className="border-t-2 border-primary pt-8 space-y-6">
                <h2 className="text-5xl font-bold text-primary">
                  The Solution
                </h2>
                <p className="text-3xl text-foreground leading-relaxed">
                  We eliminate this with a simple AI tool which lets busy parents 
                  plan their family activities in <span className="text-primary font-semibold">seconds</span>.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-8 space-y-6">
                <h3 className="text-3xl font-semibold text-foreground">
                  How it works?
                </h3>
                <ol className="space-y-4 text-xl text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-2xl">1.</span>
                    <span>We ask a couple of questions about the planned activities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-2xl">2.</span>
                    <span>Our AI agent picks the best activities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-2xl">3.</span>
                    <span>Client chooses the best activities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold text-2xl">4.</span>
                    <span>We send the calendar invites to the customer and their family's mailbox!</span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Slide 2: Business Model */}
          {currentSlide === 1 && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <h1 className="text-6xl font-bold text-foreground">
                Business Model
              </h1>

              <div className="space-y-8">
                <h2 className="text-4xl font-semibold text-primary">
                  Subscription Plans
                </h2>
                
                <div className="grid gap-6">
                  <div className="bg-primary/10 border-2 border-primary rounded-lg p-8">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-primary">
                        First Trip
                      </h3>
                      <p className="text-5xl font-bold text-foreground">
                        FREE
                      </p>
                      <p className="text-xl text-muted-foreground">
                        Let users experience the value
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-8">
                    <div className="space-y-4">
                      <h3 className="text-3xl font-bold text-foreground">
                        Monthly Subscription
                      </h3>
                      <p className="text-5xl font-bold text-primary">
                        $4.99<span className="text-2xl text-muted-foreground">/month</span>
                      </p>
                      <p className="text-xl text-muted-foreground">
                        Unlimited family trip planning
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 3: GTM Strategy */}
          {currentSlide === 2 && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <h1 className="text-6xl font-bold text-foreground">
                Go-To-Market Strategy
              </h1>

              <div className="space-y-8">
                <h2 className="text-4xl font-semibold text-primary">
                  Grassroot Efforts
                </h2>

                <div className="bg-muted/50 rounded-lg p-8 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-foreground">
                      Micro-Influencer Strategy
                    </h3>
                    <p className="text-2xl text-muted-foreground leading-relaxed">
                      Use <span className="text-primary font-semibold">Modash platform</span> to 
                      target micro influencers, especially busy moms/parents who talk about 
                      family values and offer them to try the platform for free.
                    </p>
                  </div>

                  <div className="border-t border-border pt-6 space-y-3">
                    <h4 className="text-2xl font-semibold text-foreground">
                      Target Audience:
                    </h4>
                    <ul className="space-y-2 text-xl text-muted-foreground">
                      <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Busy parents and moms
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Family-focused content creators
                      </li>
                      <li className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        Authentic voices in parenting community
                      </li>
                    </ul>
                  </div>
                </div>
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

      {/* Slide Counter */}
      <div className="absolute top-8 right-8 text-muted-foreground text-lg">
        {currentSlide + 1} / {totalSlides}
      </div>
    </div>
  );
};

export default PitchDeck;
