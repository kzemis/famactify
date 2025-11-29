import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const OnboardingInterests = () => {
  const [interests, setInterests] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!interests.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Store interests in session storage
      sessionStorage.setItem("userInterests", interests);

      // Call the edge function to generate personalized questions
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: { interests }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store the AI-generated questions
      sessionStorage.setItem("aiQuestions", JSON.stringify(data.questions));
      
      navigate("/onboarding/questions");
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate personalized questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 flex h-16 items-center">
          <span className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
            FamActify
          </span>
        </div>
      </header>
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Tell Us About Your Interests</CardTitle>
          <CardDescription className="text-lg">
            Let's discover what makes your family happy! Share your interests, hobbies, and the types of activities you enjoy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Textarea
            placeholder="We love outdoor activities, especially hiking and picnics. The kids are into art and science. We're also interested in cultural events and trying new cuisines..."
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="min-h-[200px] text-lg"
          />
          <div className="bg-accent rounded-lg p-4">
            <p className="text-sm text-accent-foreground">
              <strong>Pro tip:</strong> The more details you share, the better we can personalize your recommendations!
            </p>
          </div>
          <Button
            onClick={handleContinue}
            disabled={!interests.trim() || isLoading}
            className="w-full text-lg py-6"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Your Questions...
              </>
            ) : (
              "Continue to Questions"
            )}
          </Button>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default OnboardingInterests;
