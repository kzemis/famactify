import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: November 2024</p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information that you provide directly to us, including your name, email address, 
                family preferences, and activity interests. We also collect information about your usage of 
                our service through cookies and similar technologies.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to provide, maintain, and improve our services, including 
                personalized activity recommendations. We also use your information to communicate with you 
                about updates, offers, and support.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Information Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell your personal information to third parties. We may share your information with 
                service providers who assist us in operating our platform, and when required by law or to 
                protect our rights.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">4. Data Security</h2>
              <p className="text-muted-foreground">
                We implement appropriate technical and organizational measures to protect your personal information 
                against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">5. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, update, or delete your personal information. You can manage your 
                preferences through your account settings or by contacting us directly. You also have the right 
                to opt out of marketing communications.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">6. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our service is designed for use by parents and families. We do not knowingly collect personal 
                information from children under 13 without parental consent.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">7. Cookies and Tracking</h2>
              <p className="text-muted-foreground">
                We use cookies and similar technologies to improve your experience, analyze usage patterns, and 
                personalize content. You can control cookie preferences through your browser settings.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">8. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                via email or through the platform. Your continued use of our service constitutes acceptance of 
                the updated policy.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">9. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have any questions about this Privacy Policy or our data practices, please contact us at 
                privacy@famactify.com or through our contact page.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
