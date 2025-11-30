import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const Careers = () => {
  const navigate = useNavigate();

  const openPositions = [
    {
      title: "Senior Full Stack Developer",
      location: "Remote",
      type: "Full-time",
      description: "Help us build the future of family planning technology."
    },
    {
      title: "Product Designer",
      location: "Remote",
      type: "Full-time",
      description: "Create beautiful, intuitive experiences for families worldwide."
    },
    {
      title: "Marketing Manager",
      location: "Remote",
      type: "Full-time",
      description: "Grow our community of happy families."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">Join Our Team</h1>
            <p className="text-xl text-muted-foreground">
              Help us make family time easier for millions of parents worldwide.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Open Positions</h2>
            
            {openPositions.map((job, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{job.title}</h3>
                  <p className="text-muted-foreground">{job.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {job.type}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold">Interested in Joining Us?</h2>
            <p className="text-muted-foreground">
              We'd love to hear from you. Get in touch with us to discuss opportunities at FamActify.
            </p>
            <Button onClick={() => navigate("/contact")}>
              Contact Us
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
