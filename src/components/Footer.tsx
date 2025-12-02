import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      toast({
        title: t.footer.invalidEmail,
        description: t.footer.invalidEmailDesc,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - email already subscribed
          toast({
            title: t.footer.alreadySubscribed,
            description: t.footer.alreadySubscribedDesc,
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: t.footer.subscribeSuccess,
          description: t.footer.subscribeSuccessDesc,
        });
        setEmail("");
      }
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
      toast({
        title: t.footer.subscribeError,
        description: t.footer.subscribeErrorDesc,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const footerLinks = {
    product: [
      { label: t.footer.activityPlanner, href: "/onboarding/interests" },
      { label: t.footer.communityActivities, href: "/community" },
      { label: t.footer.contributeActivity, href: "/contribute" },
      { label: t.footer.myPlannedTrips, href: "/saved-trips" },
    ],
    support: [
      { label: t.footer.contactUs, href: "/contact" },
      { label: t.footer.faqs, href: "/faq" },
      { label: t.footer.presentation, href: "/pitch-deck" },
    ],
    legal: [
      { label: t.footer.privacyPolicy, href: "/privacy" },
      { label: t.footer.termsOfService, href: "/terms" },
    ],
  };

  return (
    <footer className="bg-gradient-to-b from-accent/20 to-accent/30 border-t border-border/30 relative z-10">
      <div className="container mx-auto px-4 py-12">
        {/* Newsletter Section */}
        <div className="mb-12 max-w-md mx-auto text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">{t.footer.stayUpdated}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t.footer.newsletterDescription}
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder={t.footer.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="flex-1"
              required
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t.footer.subscribe
              )}
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.product}</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer relative z-10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.support}</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer relative z-10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.legal}</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer relative z-10"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/home" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary hover:opacity-80 transition-opacity cursor-pointer">FamActify</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            {t.footer.tagline}
          </p>
          <p className="text-sm text-muted-foreground">
            © {currentYear} FamActify. {t.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;