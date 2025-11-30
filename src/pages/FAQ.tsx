import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Footer from "@/components/Footer";
import AppHeader from "@/components/AppHeader";

const FAQ = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      question: "What is FamActify?",
      answer: "FamActify is an AI-powered family activity planning tool that helps busy parents discover and plan perfect activities for their families in seconds, instead of spending hours researching across multiple platforms."
    },
    {
      question: "How does the AI recommendation work?",
      answer: "Our AI analyzes your family's preferences, interests, location, and schedule to suggest personalized activities. We consider factors like children's ages, budget, and available time to provide the best matches."
    },
    {
      question: "Is the first trip really free?",
      answer: "Yes! You can plan your first family trip completely free with no credit card required. This lets you experience the full value of FamActify before deciding to subscribe."
    },
    {
      question: "What's included in the Family plan?",
      answer: "The Family plan at €3.99/month includes: 4 trips per month, shared wishlists with relatives, calendar integration, and customer support."
    },
    {
      question: "Can I share plans with my family members?",
      answer: "Absolutely! You can easily share your itineraries with all family members. With the Family plan, you can also create shared wishlists with relatives."
    },
    {
      question: "How does calendar integration work?",
      answer: "Once you finalize your activity plan, we can send calendar invites directly to you and your family members' email, so everyone stays in sync."
    },
    {
      question: "What areas do you cover?",
      answer: "We currently focus on activities in the Baltic region, with plans to expand to more locations soon. Our database includes trails, parks, museums, family-friendly venues, and more."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-foreground">Frequently Asked Questions</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about FamActify.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center pt-8 space-y-4">
            <p className="text-muted-foreground">Still have questions?</p>
            <Button onClick={() => navigate("/contact")} variant="outline">
              Contact Us
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
