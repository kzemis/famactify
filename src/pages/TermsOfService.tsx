import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: November 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using FamActify, you accept and agree to be bound by the terms and 
                provisions of this agreement. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. Description of Service</h2>
              <p className="text-muted-foreground">
                FamActify provides an AI-powered platform for family activity planning and recommendations. 
                We offer both free and paid subscription plans with varying features and usage limits.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You may need to create an account to access certain features. You are responsible for 
                maintaining the confidentiality of your account information and for all activities under your account.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Subscription and Payments</h2>
              <p className="text-muted-foreground">
                Paid subscriptions are billed monthly. You can cancel your subscription at any time, 
                and you will continue to have access until the end of your current billing period.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of any content you submit to the platform. By submitting content, 
                you grant us a license to use it for providing and improving our services.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                FamActify provides activity recommendations for informational purposes only. We are not 
                responsible for the accuracy of third-party information or the quality of recommended activities.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. We will notify users of significant 
                changes via email or through the platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact us at hello@famactify.com.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
