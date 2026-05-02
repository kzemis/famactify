import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { CountryProvider } from "@/i18n/CountryContext";
import { FamilyModeProvider } from "@/contexts/FamilyModeContext";
import { PlanBoardProvider } from "@/contexts/PlanBoardContext";
import BottomTabBar from "@/components/BottomTabBar";
import { type ReactNode } from "react";
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
import GeneratedActivities from "./pages/GeneratedActivities";
import ConfirmAttendance from "./pages/ConfirmAttendance";
import SharedTrip from "./pages/SharedTrip";
import TestAuth from "./pages/TestAuth";
import EventsCalendar from "./pages/EventsCalendar";
import CatComparison from "./pages/CatComparison";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import EditActivity from "./pages/EditActivity";
import SessionPlanner from "./pages/SessionPlanner";
import CuratedLists from "./pages/CuratedLists";
import CuratedListDetail from "./pages/CuratedListDetail";
import AdminLists from "./pages/AdminLists";
import AdminListEdit from "./pages/AdminListEdit";
import LongHorizonPlanner from "./pages/LongHorizonPlanner";
import BalanceTracker from "./pages/BalanceTracker";
import OrgSetup from "./pages/OrgSetup";
import OrgDashboard from "./pages/OrgDashboard";
import OrgListEdit from "./pages/OrgListEdit";
import KasparsPage from "./pages/KasparsPage";

const queryClient = new QueryClient();

const TAB_ROUTES = ['/activities', '/plan', '/saved-trips', '/kids', '/profile'];

function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showTabBar = TAB_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  return <>{children}{showTabBar && <BottomTabBar />}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <FamilyModeProvider>
    <PlanBoardProvider>
    <LanguageProvider>
      <CountryProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell>
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
          <Route path="/activities" element={<CommunityActivities />} />
          <Route path="/activities/:id/edit" element={<ProtectedRoute><EditActivity /></ProtectedRoute>} />
          <Route path="/generated-activities" element={<GeneratedActivities />} />
          <Route path="/confirm" element={<ConfirmAttendance />} />
          <Route path="/trip/:shareToken" element={<SharedTrip />} />
          <Route path="/test-auth" element={<TestAuth />} />
          <Route path="/events-calendar" element={<EventsCalendar />} />
          <Route path="/cats" element={<CatComparison />} />
          <Route path="/plan" element={<ProtectedRoute><SessionPlanner /></ProtectedRoute>} />
          <Route path="/kids" element={<Navigate to="/activities" replace />} />
          <Route path="/lists" element={<CuratedLists />} />
          <Route path="/lists/:slug" element={<CuratedListDetail />} />
          <Route path="/admin/lists" element={<ProtectedRoute><AdminLists /></ProtectedRoute>} />
          <Route path="/admin/lists/new" element={<ProtectedRoute><AdminListEdit /></ProtectedRoute>} />
          <Route path="/admin/lists/:id" element={<ProtectedRoute><AdminListEdit /></ProtectedRoute>} />
          <Route path="/plan/horizon" element={<ProtectedRoute><LongHorizonPlanner /></ProtectedRoute>} />
          <Route path="/balance" element={<ProtectedRoute><BalanceTracker /></ProtectedRoute>} />
          <Route path="/proposals" element={<Navigate to="/activities?view=plan" replace />} />
          <Route path="/org/setup" element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />
          <Route path="/org/dashboard" element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
          <Route path="/org/lists/new" element={<ProtectedRoute><OrgListEdit /></ProtectedRoute>} />
          <Route path="/org/lists/:id" element={<ProtectedRoute><OrgListEdit /></ProtectedRoute>} />
          <Route path="/kaspars" element={<KasparsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </AppShell>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
      </CountryProvider>
    </LanguageProvider>
    </PlanBoardProvider>
    </FamilyModeProvider>
  </QueryClientProvider>
);

export default App;
