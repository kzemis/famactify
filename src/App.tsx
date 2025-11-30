import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import OnboardingInterests from "./pages/OnboardingInterests";
import OnboardingQuestions from "./pages/OnboardingQuestions";
import Events from "./pages/Events";
import Itinerary from "./pages/Itinerary";
import Calendar from "./pages/Calendar";
import SavedTrips from "./pages/SavedTrips";
import PitchDeck from "./pages/PitchDeck";
import AboutUs from "./pages/AboutUs";
import Careers from "./pages/Careers";
import Benefits from "./pages/Benefits";
import FAQ from "./pages/FAQ";
import ContactUs from "./pages/ContactUs";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Contribute from "./pages/Contribute";
import CommunityActivities from "./pages/CommunityActivities";
import ConfirmAttendance from "./pages/ConfirmAttendance";
import SharedTrip from "./pages/SharedTrip";
import TestAuth from "./pages/TestAuth";
import EventsCalendar from "./pages/EventsCalendar";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

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
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/onboarding/interests" element={<ProtectedRoute><OnboardingInterests /></ProtectedRoute>} />
          <Route path="/onboarding/questions" element={<ProtectedRoute><OnboardingQuestions /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
          <Route path="/itinerary" element={<ProtectedRoute><Itinerary /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="/saved-trips" element={<ProtectedRoute><SavedTrips /></ProtectedRoute>} />
          <Route path="/pitch-deck" element={<PitchDeck />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contribute" element={<ProtectedRoute><Contribute /></ProtectedRoute>} />
          <Route path="/community" element={<CommunityActivities />} />
          <Route path="/confirm" element={<ConfirmAttendance />} />
          <Route path="/trip/:shareToken" element={<SharedTrip />} />
          <Route path="/test-auth" element={<TestAuth />} />
          <Route path="/events-calendar" element={<EventsCalendar />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
