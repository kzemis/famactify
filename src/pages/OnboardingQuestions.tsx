import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Users, DollarSign, Clock } from "lucide-react";

const questions = [
  {
    id: "location",
    icon: <MapPin className="h-6 w-6" />,
    title: "Where are you planning activities?",
    placeholder: "e.g., San Francisco, CA",
    type: "text"
  },
  {
    id: "dates",
    icon: <Calendar className="h-6 w-6" />,
    title: "What dates are you looking at?",
    placeholder: "e.g., March 15-17, 2024",
    type: "text"
  },
  {
    id: "familySize",
    icon: <Users className="h-6 w-6" />,
    title: "How many people in your group?",
    placeholder: "e.g., 4 (2 adults, 2 kids)",
    type: "text"
  },
  {
    id: "budget",
    icon: <DollarSign className="h-6 w-6" />,
    title: "What's your budget per person?",
    placeholder: "e.g., $50-100",
    type: "text"
  },
  {
    id: "duration",
    icon: <Clock className="h-6 w-6" />,
    title: "Preferred activity duration?",
    placeholder: "e.g., 2-3 hours",
    type: "text"
  }
];

const OnboardingQuestions = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Store all data
      sessionStorage.setItem("userAnswers", JSON.stringify(answers));
      navigate("/events");
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const question = questions[currentQuestion];
  const currentAnswer = answers[question.id] || "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {question.icon}
              </div>
              <CardTitle className="text-2xl">{question.title}</CardTitle>
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer" className="sr-only">Your answer</Label>
              <Input
                id="answer"
                type={question.type}
                placeholder={question.placeholder}
                value={currentAnswer}
                onChange={(e) => handleAnswer(e.target.value)}
                className="text-lg py-6"
                autoFocus
              />
            </div>
          </div>

          <div className="flex gap-4">
            {currentQuestion > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
                size="lg"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!currentAnswer.trim()}
              className="flex-1"
              size="lg"
            >
              {currentQuestion === questions.length - 1 ? "Find Events" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingQuestions;
