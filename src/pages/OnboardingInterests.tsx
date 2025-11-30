import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import Footer from "@/components/Footer";

const OnboardingInterests = () => {
  const [interests, setInterests] = useState("");
  const [maxQuestions, setMaxQuestions] = useState(5);
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
        body: { interests, maxQuestions }
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex flex-col">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
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
          <div className="space-y-3">
            <Label className="text-base font-medium">
              I am willing to answer max {maxQuestions} question{maxQuestions !== 1 ? 's' : ''}
            </Label>
            <Slider
              value={[maxQuestions]}
              onValueChange={(value) => setMaxQuestions(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 question</span>
              <span>10 questions</span>
            </div>
          </div>
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
      <Footer />
    </div>
  );
};

export default OnboardingInterests;
