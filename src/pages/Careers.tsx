import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Briefcase, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center justify-between">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  <Button>
                    <Briefcase className="w-4 h-4 mr-2" />
                    Apply Now
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold">Don't see a perfect fit?</h2>
            <p className="text-muted-foreground">
              We're always looking for talented people. Send us your resume and tell us how you'd like to contribute.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline">Send General Application</Button>
              <Button onClick={() => navigate("/benefits")}>
                View Our Benefits
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;
