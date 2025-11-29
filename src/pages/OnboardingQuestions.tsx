import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, MapPin, Users, DollarSign, Clock, Heart, Sun, Utensils, Baby, Home } from "lucide-react";

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-6 w-6" />,
  MapPin: <MapPin className="h-6 w-6" />,
  Users: <Users className="h-6 w-6" />,
  DollarSign: <DollarSign className="h-6 w-6" />,
  Clock: <Clock className="h-6 w-6" />,
  Heart: <Heart className="h-6 w-6" />,
  Sun: <Sun className="h-6 w-6" />,
  Utensils: <Utensils className="h-6 w-6" />,
  Baby: <Baby className="h-6 w-6" />,
  Home: <Home className="h-6 w-6" />,
};

interface Question {
  id: string;
  title: string;
  placeholder: string;
  type: string;
  icon: string;
}

const defaultQuestions: Question[] = [
  {
    id: "location",
    icon: "MapPin",
    title: "Where are you planning activities?",
    placeholder: "e.g., Riga, Jurmala, Sigulda",
    type: "text"
  },
  {
    id: "date",
    icon: "Calendar",
    title: "What date are you planning for?",
    placeholder: "e.g., March 15, 2024",
    type: "text"
  },
  {
    id: "familySize",
    icon: "Users",
    title: "How many people in your group?",
    placeholder: "e.g., 4 (2 adults, 2 kids)",
    type: "text"
  },
  {
    id: "budget",
    icon: "DollarSign",
    title: "What's your budget per person?",
    placeholder: "e.g., €30-50",
    type: "text"
  }
];

const OnboardingQuestions = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const navigate = useNavigate();

  // Load AI-generated questions if available
  useEffect(() => {
    const aiQuestionsStr = sessionStorage.getItem("aiQuestions");
    if (aiQuestionsStr) {
      try {
        const aiQuestions = JSON.parse(aiQuestionsStr);
        if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
          setQuestions(aiQuestions);
        }
      } catch (error) {
        console.error('Error parsing AI questions:', error);
        // Fall back to default questions
      }
    }
  }, []);

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
  const questionIcon = iconMap[question.icon] || <Heart className="h-6 w-6" />;

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
                {questionIcon}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentAnswer.trim()) {
                    handleNext();
                  }
                }}
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
