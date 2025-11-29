import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import OnboardingInterests from "./pages/OnboardingInterests";
import OnboardingQuestions from "./pages/OnboardingQuestions";
import Events from "./pages/Events";
import Itinerary from "./pages/Itinerary";
import Calendar from "./pages/Calendar";
import SavedTrips from "./pages/SavedTrips";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding/interests" element={<OnboardingInterests />} />
          <Route path="/onboarding/questions" element={<OnboardingQuestions />} />
          <Route path="/events" element={<Events />} />
          <Route path="/itinerary" element={<Itinerary />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/saved-trips" element={<SavedTrips />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
