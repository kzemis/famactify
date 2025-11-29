import { Button } from "@/components/ui/button";
import { Heart, Users, Target } from "lucide-react";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">About Us</h1>
            <p className="text-xl text-muted-foreground">
              We're on a mission to make family time easier and more enjoyable.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Our Story</h2>
                <p className="text-muted-foreground">
                  FamActify was born from a simple frustration: planning quality family time shouldn't take hours 
                  of research across multiple platforms. As parents ourselves, we knew there had to be a better way.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Our Mission</h2>
                <p className="text-muted-foreground">
                  We believe every family deserves stress-free planning and memorable experiences. Our AI-powered 
                  platform eliminates the research burden so you can focus on what matters most—being together.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Our Team</h2>
                <p className="text-muted-foreground">
                  We're a small but passionate team of engineers and designers who understand the 
                  challenges of modern family life. Every feature we build is designed with real families in mind.
                </p>
              </div>
          </div>
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUs;
