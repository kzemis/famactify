import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, Clock, DollarSign, GraduationCap, Home, Plane, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

const Benefits = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Home className="h-6 w-6" />,
      title: "Remote-First Culture",
      description: "Work from anywhere in the world. We trust you to do your best work wherever you're most comfortable."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Flexible Hours",
      description: "We focus on results, not hours. Set your own schedule that works best for you and your family."
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Competitive Salary",
      description: "We offer market-rate compensation with regular reviews and performance-based bonuses."
    },
    {
      icon: <Heart className="h-6 w-6" />,
      title: "Health & Wellness",
      description: "Comprehensive health insurance, mental health support, and wellness stipend for gym or fitness activities."
    },
    {
      icon: <Plane className="h-6 w-6" />,
      title: "Unlimited PTO",
      description: "Take the time you need to recharge. We encourage at least 4 weeks off per year."
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "Learning Budget",
      description: "€1,000 annual budget for courses, books, conferences, and professional development."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Team Retreats",
      description: "Annual company retreats to connect with teammates in person and have fun together."
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Latest Equipment",
      description: "Get the tools you need to do your best work - laptop, monitor, ergonomic setup, and more."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
          <Button variant="ghost" onClick={() => navigate("/careers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Careers
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">Company Benefits</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We believe happy employees create the best products. Here's how we take care of our team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {benefit.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center pt-8 space-y-4">
            <p className="text-lg text-muted-foreground">
              Ready to join a team that values you?
            </p>
            <Button onClick={() => navigate("/careers")} size="lg">
              View Open Positions
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Benefits;
