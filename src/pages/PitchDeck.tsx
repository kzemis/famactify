import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Target, Rocket, X, Maximize, Minimize, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import kasparsPhoto from "@/assets/team-kaspars-new.jpg";
import dainisPhoto from "@/assets/team-dainis.jpg";
import kirillPhoto from "@/assets/team-kirill.jpg";

const PitchDeck = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const navigate = useNavigate();
  const totalSlides = 5;

  // Minimum swipe distance (in px) to trigger navigation
  const minSwipeDistance = 50;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

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

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < totalSlides - 1) {
      nextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slide Container */}
      <div 
        className="flex-1 flex items-center justify-center p-4 md:p-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="w-full h-full px-4 md:px-8">
          {/* Slide 1: Problem/Solution & Founders */}
          {currentSlide === 0 && (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
              <div className="space-y-4">
                <span className="text-2xl font-bold text-primary">FamActify</span>
                <h2 className="text-6xl md:text-7xl font-bold text-primary">Planning a Family Trip usually takes up to 8 Hours!</h2>
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                  Parents use <span className="text-primary font-semibold">Google, Instagram, TikTok, ChatGPT</span>{" "}
                  etc. to collect information, verify details, and manually plan trips.
                </p>
              </div>

              <div className="border-t-2 border-primary pt-6 space-y-4">
                <h2 className="text-6xl md:text-7xl font-bold text-primary">Our Solution</h2>
                <p className="text-xl md:text-2xl text-foreground leading-relaxed">
                  A simple AI tool that helps busy parents plan family activities in{" "}
                  <span className="text-primary font-semibold">seconds</span>, eliminating hours of planning.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-8 space-y-6">
                <h3 className="text-3xl md:text-4xl font-semibold text-foreground">Team</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="space-y-3 text-center">
                    <img 
                      src={kasparsPhoto} 
                      alt="Kaspars Zemitis"
                      className="mx-auto h-48 w-48 rounded-full object-cover mb-2"
                    />
                    <h4 className="text-2xl font-bold text-primary">Kaspars Zemitis</h4>
                    <p className="text-lg text-muted-foreground">8+ years in ticketing service development, specialized in data scraping and data pipeline building</p>
                  </div>
                  <div className="space-y-3 text-center">
                    <img 
                      src={dainisPhoto} 
                      alt="Dainis Dulbinskis"
                      className="mx-auto h-48 w-48 rounded-full object-cover mb-2"
                    />
                    <h4 className="text-2xl font-bold text-primary">Dainis Dulbinskis</h4>
                    <p className="text-lg text-muted-foreground">
                      2nd time founder, successful launch of marketplace ($250K+ revenue), 12+ years in advertising
                    </p>
                  </div>
                  <div className="space-y-3 text-center">
                    <img 
                      src={kirillPhoto} 
                      alt="Kirill Luschin"
                      className="mx-auto h-48 w-48 rounded-full object-cover mb-2"
                    />
                    <h4 className="text-2xl font-bold text-primary">Kirill Luschin</h4>
                    <p className="text-lg text-muted-foreground">CS student, developer at heart and teenager!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 2: Interactive Demo */}
          {currentSlide === 1 && (
            <div className="space-y-16 animate-in fade-in duration-500 text-center">
              <div className="space-y-8">
                <Play className="h-32 w-32 mx-auto text-primary" />
                <h1 className="text-7xl md:text-8xl font-bold text-foreground">See It In Action</h1>
                <p className="text-3xl md:text-4xl text-muted-foreground leading-relaxed max-w-4xl mx-auto">
                  Experience how FamActify helps you plan family activities in seconds. Try our AI-powered questionnaire
                  and see personalized recommendations.
                </p>
              </div>

              <Button size="lg" onClick={startDemo} className="text-2xl px-16 py-10 h-auto">
                <Play className="mr-4 h-8 w-8" />
                Start Live Demo
              </Button>

              <p className="text-xl text-muted-foreground">You'll return to this presentation after the demo</p>
            </div>
          )}

          {/* Slide 3: Pricing */}
          {currentSlide === 2 && (
            <div className="space-y-14 animate-in fade-in duration-500">
              <div className="text-center mb-20">
                <h1 className="text-7xl md:text-8xl font-bold text-foreground mb-6">Choose Your Plan</h1>
                <p className="text-3xl md:text-4xl text-muted-foreground">Start free, upgrade when you're ready</p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
                <Card className="p-12">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold mb-4">Free</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold">€0</span>
                      <span className="text-xl text-muted-foreground">/forever</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Plan 1 trip for free</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Basic planning features</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Try before you buy</span>
                    </li>
                  </ul>
                  <Button className="w-full text-xl py-6" variant="outline">
                    Start Free
                  </Button>
                </Card>

                <Card className="p-12 relative border-primary border-2 shadow-2xl scale-105 md:scale-110 py-16 z-10">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-6 py-2 rounded-full text-lg font-medium">
                    Most Popular
                  </div>
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold mb-4">Family</h3>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold">€3.99</span>
                      <span className="text-xl text-muted-foreground">/per month</span>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-10">
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Unlimited trips</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Create wishlists with relatives</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Calendar integration</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <Check className="h-7 w-7 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-lg">Customer support</span>
                    </li>
                  </ul>
                  <Button className="w-full text-xl py-6">
                    Get Started
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* Slide 4: Traction, Roadmap & GTM */}
          {currentSlide === 3 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <h1 className="text-7xl md:text-8xl font-bold text-foreground">Traction & Roadmap</h1>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Left Column: GTM Section */}
                <div className="bg-muted/50 rounded-lg p-10">
                  <h2 className="text-5xl font-bold text-primary flex items-center gap-3 mb-6">
                    <Rocket className="h-12 w-12" />
                    Go-To-Market Strategy
                  </h2>
                  <div className="space-y-6">
                    <p className="text-3xl text-muted-foreground leading-relaxed">
                      Target micro-influencers (busy moms/parents) via{" "}
                      <span className="text-primary font-semibold">Modash platform</span> who talk about family values.
                      Offer free trial in exchange for authentic reviews.
                    </p>
                    <div>
                      <p className="text-3xl font-semibold text-foreground mb-3">Target Audience:</p>
                      <ul className="text-2xl text-muted-foreground space-y-2">
                        <li>• Busy parents and moms</li>
                        <li>• Family content creators</li>
                        <li>• Parenting community voices</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-10 space-y-6">
                  {/* First Month */}
                  <div className="space-y-3">
                    <h3 className="text-4xl font-bold text-primary">First Month</h3>
                    {["Launch in Latvia and refine product", "Acquire first 100 customers"].map((milestone, index) => (
                      <div key={index} className="flex items-center gap-3 bg-background rounded-lg p-4">
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                          {index + 1}
                        </div>
                        <span className="text-2xl text-foreground">{milestone}</span>
                      </div>
                    ))}
                  </div>

                  {/* Second Month */}
                  <div className="space-y-3">
                    <h3 className="text-4xl font-bold text-primary">Second Month</h3>
                    {["Raise pre-seed funding", "Raise up the team and modernize the app"].map((milestone, index) => (
                      <div key={index} className="flex items-center gap-3 bg-background rounded-lg p-4">
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                          {index + 3}
                        </div>
                        <span className="text-2xl text-foreground">{milestone}</span>
                      </div>
                    ))}
                  </div>

                  {/* Third Month */}
                  <div className="space-y-3">
                    <h3 className="text-4xl font-bold text-primary">Third Month</h3>
                    {["Expand to Baltics", "Build GTM strategy for Europe"].map((milestone, index) => (
                      <div key={index} className="flex items-center gap-3 bg-background rounded-lg p-4">
                        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                          {index + 5}
                        </div>
                        <span className="text-2xl text-foreground">{milestone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slide 5: Community QR Code */}
          {currentSlide === 4 && (
            <div className="flex flex-col items-center justify-center space-y-16 animate-in fade-in duration-500">
              <div className="bg-white p-20 rounded-3xl shadow-2xl">
                <QRCode 
                  value="https://famactify.app/" 
                  size={700}
                  level="M"
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              </div>
              
              <div className="text-center space-y-8">
                <h2 className="text-7xl md:text-8xl font-bold text-primary">Plan your weekend now</h2>
                <p className="text-2xl text-primary font-semibold">famactify.app</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="border-t border-border bg-card/50">
        <div className="w-full px-8 py-6 flex items-center justify-between">
          <Button variant="ghost" size="lg" onClick={prevSlide} disabled={currentSlide === 0} className="gap-2">
            <ChevronLeft className="w-5 h-5" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
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

      {/* Top Controls */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="text-muted-foreground hover:text-foreground"
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
        </Button>
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
