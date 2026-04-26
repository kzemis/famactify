import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, MapPin, Users, Heart, Search, Edit3, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-family.jpg";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="container relative mx-auto px-4 py-10 md:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Discover &amp; Plan{" "}
                <span className="text-primary">Memorable Family Activities</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                A community-built registry of family-friendly places, events and experiences.
                Browse what's nearby, build a day plan, or contribute a spot you love.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/activities")}
                  className="text-base px-7 py-5 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                >
                  <Search className="w-4 h-4 mr-2" /> Browse Activities
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/contribute")}
                  className="text-base px-7 py-5 rounded-2xl"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Contribute a Spot
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

      {/* ── 3 big CTAs ── */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">What would you like to do?</h2>
          <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
            FamActify helps families discover activities, plan days out, and share great spots with the community.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            {/* CTA 1 — Browse & Plan */}
            <Card
              className="p-7 flex flex-col gap-4 cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group"
              onClick={() => navigate("/activities")}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Search className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Browse &amp; Plan</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Explore the activity registry, filter by age, category and budget,
                  then build a timed day plan with a route map.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto self-start group-hover:border-primary group-hover:text-primary transition-colors">
                Open registry →
              </Button>
            </Card>

            {/* CTA 2 — Contribute */}
            <Card
              className="p-7 flex flex-col gap-4 cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group"
              onClick={() => navigate("/contribute")}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Edit3 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Contribute a Spot</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Know a great park, museum, class or event? Add it to the registry
                  so other families can discover it too.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto self-start group-hover:border-primary group-hover:text-primary transition-colors">
                Add activity →
              </Button>
            </Card>

            {/* CTA 3 — Get a Day Plan */}
            <Card
              className="p-7 flex flex-col gap-4 cursor-pointer hover:shadow-xl hover:border-primary/50 transition-all group border-primary/30"
              onClick={() => navigate("/activities")}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                <Calendar className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Get a Day Plan</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Planning a Saturday out, a rainy day or a holiday?
                  Pick activities and build a timed itinerary with a route map.
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-auto self-start group-hover:border-primary group-hover:text-primary transition-colors">
                Plan a day →
              </Button>
            </Card>

          </div>
        </div>
      </section>

      {/* ── Why families use FamActify ── */}
      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">Why families use FamActify</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: <MapPin className="h-5 w-5" />,
                title: "Real local places",
                desc: "Activities contributed and verified by local families — not generic web results.",
              },
              {
                icon: <Calendar className="h-5 w-5" />,
                title: "Day planner built in",
                desc: "Add activities to your plan, reorder them, see the total time and route on a map.",
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: "For all ages",
                desc: "Filter by age group, involvement style, budget, accessibility and weather suitability.",
              },
              {
                icon: <Heart className="h-5 w-5" />,
                title: "Community maintained",
                desc: "Anyone can contribute a spot. The more families share, the better the registry gets.",
              },
            ].map((f, i) => (
              <Card key={i} className="p-5 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section className="py-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="flex gap-3 p-4 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground/70" />
            <p>
              <strong className="text-foreground">Information notice:</strong>{" "}
              Activity information on FamActify is contributed by community members and is provided for informational
              purposes only. FamActify does not guarantee the accuracy, completeness or timeliness of any listing.
              Opening hours, prices and availability can change — please verify details directly with the activity
              provider before visiting.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
