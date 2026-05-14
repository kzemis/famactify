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
import { type ReactNode, lazy, Suspense } from "react";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import { AuthGateProvider } from "@/hooks/use-auth-gate";
import AuthGate from "@/components/AuthGate";
import Profile from "./pages/Profile";

import OnboardingInterests from "./pages/OnboardingInterests";
import OnboardingQuestions from "./pages/OnboardingQuestions";
import Events from "./pages/Events";
import Itinerary from "./pages/Itinerary";
import Calendar from "./pages/Calendar";
import SavedTrips from "./pages/SavedTrips";
// Static / marketing routes are large but rarely visited from the app shell — lazy-load them.
const PitchDeck       = lazy(() => import("./pages/PitchDeck"));
const AboutUs         = lazy(() => import("./pages/AboutUs"));
const Careers         = lazy(() => import("./pages/Careers"));
const Benefits        = lazy(() => import("./pages/Benefits"));
const FAQ             = lazy(() => import("./pages/FAQ"));
const ContactUs       = lazy(() => import("./pages/ContactUs"));
const TermsOfService  = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy   = lazy(() => import("./pages/PrivacyPolicy"));
const Contribute      = lazy(() => import("./pages/Contribute"));
import CommunityActivities from "./pages/CommunityActivities";
import GeneratedActivities from "./pages/GeneratedActivities";
import ConfirmAttendance from "./pages/ConfirmAttendance";
import SharedTrip from "./pages/SharedTrip";

import EventsCalendar from "./pages/EventsCalendar";
import CatComparison from "./pages/CatComparison";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import EditActivity from "./pages/EditActivity";
import KidModePage from "./pages/KidModePage";
import CuratedLists from "./pages/CuratedLists";
import CuratedListDetail from "./pages/CuratedListDetail";
const AdminLists         = lazy(() => import("./pages/AdminLists"));
const AdminListEdit      = lazy(() => import("./pages/AdminListEdit"));
const AdminActivityDemoCuration = lazy(() => import("./pages/AdminActivityDemoCuration"));
const LongHorizonPlanner = lazy(() => import("./pages/LongHorizonPlanner"));
const BalanceTracker     = lazy(() => import("./pages/BalanceTracker"));
const OrgSetup           = lazy(() => import("./pages/OrgSetup"));
const OrgDashboard       = lazy(() => import("./pages/OrgDashboard"));
const OrgListEdit        = lazy(() => import("./pages/OrgListEdit"));
import KasparsPage from "./pages/KasparsPage";
import Hunts from "./pages/Hunts";
import HuntDetail from "./pages/HuntDetail";
import HuntPlay from "./pages/HuntPlay";
// Heavy / rarely-visited routes are code-split — they load only when navigated to.
// Cuts the initial JS bundle by ~half (saw ~1.6 MB → ~0.7 MB in build output).
const OrgHunts          = lazy(() => import("./pages/OrgHunts"));
const AdminHunts        = lazy(() => import("./pages/AdminHunts"));
const HuntEdit          = lazy(() => import("./pages/HuntEdit"));
const AdminPhotoReviews = lazy(() => import("./pages/AdminPhotoReviews"));
const Passport          = lazy(() => import("./pages/Passport"));
const Chores            = lazy(() => import("./pages/Chores"));
const ChoreEdit         = lazy(() => import("./pages/ChoreEdit"));
const RaceLobby         = lazy(() => import("./pages/RaceLobby"));
const RacePlay          = lazy(() => import("./pages/RacePlay"));
const RaceResults       = lazy(() => import("./pages/RaceResults"));
const DuoLobby          = lazy(() => import("./pages/DuoLobby"));
const DuoPlay           = lazy(() => import("./pages/DuoPlay"));

const queryClient = new QueryClient();

const TAB_ROUTES = ['/', '/activities', '/plan', '/saved-trips', '/kids', '/profile', '/hunts'];

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
          <AuthGateProvider>
          <AuthGate />
          <AppShell>
          <Suspense
            fallback={
              <div className="min-h-[60dvh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            }
          >
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/home" element={<Navigate to="/activities" replace />} />
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

          <Route path="/events-calendar" element={<EventsCalendar />} />
          <Route path="/cats" element={<CatComparison />} />
          <Route path="/plan" element={<Navigate to="/activities?view=plan" replace />} />
          <Route path="/kids" element={<KidModePage />} />
          <Route path="/lists" element={<CuratedLists />} />
          <Route path="/lists/:slug" element={<CuratedListDetail />} />
          <Route path="/admin/lists" element={<ProtectedRoute><AdminRoute><AdminLists /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/lists/new" element={<ProtectedRoute><AdminRoute><AdminListEdit /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/lists/:id" element={<ProtectedRoute><AdminRoute><AdminListEdit /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/activities-demo" element={<ProtectedRoute><AdminRoute><AdminActivityDemoCuration /></AdminRoute></ProtectedRoute>} />
          <Route path="/plan/horizon" element={<ProtectedRoute><LongHorizonPlanner /></ProtectedRoute>} />
          <Route path="/balance" element={<ProtectedRoute><BalanceTracker /></ProtectedRoute>} />
          <Route path="/proposals" element={<Navigate to="/activities?view=plan" replace />} />
          <Route path="/org/setup" element={<ProtectedRoute><OrgSetup /></ProtectedRoute>} />
          <Route path="/org/dashboard" element={<ProtectedRoute><OrgDashboard /></ProtectedRoute>} />
          <Route path="/org/lists/new" element={<ProtectedRoute><OrgListEdit /></ProtectedRoute>} />
          <Route path="/org/lists/:id" element={<ProtectedRoute><OrgListEdit /></ProtectedRoute>} />
          <Route path="/kaspars" element={<KasparsPage />} />
          <Route path="/hunts" element={<Hunts />} />
          <Route path="/hunts/:slug" element={<HuntDetail />} />
          <Route path="/hunts/:slug/play" element={<HuntPlay />} />
          {/* Org-side hunt management */}
          <Route path="/org/hunts" element={<ProtectedRoute><OrgHunts /></ProtectedRoute>} />
          <Route path="/org/hunts/new" element={<ProtectedRoute><HuntEdit /></ProtectedRoute>} />
          <Route path="/org/hunts/:id" element={<ProtectedRoute><HuntEdit /></ProtectedRoute>} />
          {/* Admin-side hunt approval */}
          <Route path="/admin/hunts" element={<ProtectedRoute><AdminRoute><AdminHunts /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/hunts/photo-review" element={<ProtectedRoute><AdminRoute><AdminPhotoReviews /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/hunts/new" element={<ProtectedRoute><AdminRoute><HuntEdit /></AdminRoute></ProtectedRoute>} />
          <Route path="/admin/hunts/:id" element={<ProtectedRoute><AdminRoute><HuntEdit /></AdminRoute></ProtectedRoute>} />
          {/* Passport & Races */}
          <Route path="/passport" element={<ProtectedRoute><Passport /></ProtectedRoute>} />
          {/* Home Chores — parent-created hidden hunts */}
          <Route path="/chores" element={<ProtectedRoute><Chores /></ProtectedRoute>} />
          <Route path="/chores/new" element={<ProtectedRoute><ChoreEdit /></ProtectedRoute>} />
          <Route path="/chores/edit/:slug" element={<ProtectedRoute><ChoreEdit /></ProtectedRoute>} />
          <Route path="/race/create/:slug" element={<ProtectedRoute><RaceLobby /></ProtectedRoute>} />
          <Route path="/race/join" element={<ProtectedRoute><RaceLobby /></ProtectedRoute>} />
          <Route path="/race/:raceId/play" element={<ProtectedRoute><RacePlay /></ProtectedRoute>} />
          <Route path="/race/:raceId/results" element={<ProtectedRoute><RaceResults /></ProtectedRoute>} />
          {/* Two-phone parent+kid duo mode */}
          <Route path="/duo/host/:slug" element={<ProtectedRoute><DuoLobby /></ProtectedRoute>} />
          <Route path="/duo/join" element={<ProtectedRoute><DuoLobby /></ProtectedRoute>} />
          <Route path="/duo/:sessionId/play" element={<ProtectedRoute><DuoPlay /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </AppShell>
          </AuthGateProvider>
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
