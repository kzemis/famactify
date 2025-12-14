import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Sparkles, Map, Users, Heart } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";

const Home = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: <Sparkles className="h-8 w-8" />,
      title: "Discover Events",
      description: "Find perfect activities for your family",
      action: () => navigate("/onboarding/interests"),
      color: "from-primary/20 to-primary/5",
    },
    {
      icon: <Map className="h-8 w-8" />,
      title: "Saved Trips",
      description: "View your planned adventures",
      action: () => navigate("/saved-trips"),
      color: "from-accent/20 to-accent/5",
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Calendar",
      description: "See your upcoming activities",
      action: () => navigate("/calendar"),
      color: "from-secondary/20 to-secondary/5",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Family Profile",
      description: "Update your preferences",
      action: () => navigate("/profile"),
      color: "from-muted/40 to-muted/10",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <AppHeader />
      <div className="max-w-4xl mx-auto space-y-8 p-4 py-8">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">
            Welcome to <span className="text-primary">FamActify</span>!
          </h1>
          <p className="text-muted-foreground text-lg">
            Ready to plan your next family adventure?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          {quickActions.map((action, idx) => (
            <Card
              key={idx}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
              onClick={action.action}
            >
              <CardContent
                className={`p-6 bg-gradient-to-br ${action.color} rounded-lg`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-background/80 text-primary">
                    {action.icon}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Catalog CTA */}
        <div className="mt-6">
          <Button
            size="lg"
            onClick={() => navigate("/community")}
            className="w-full"
          >
            Activity catalog
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Home;
