import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThirdwebProvider } from "thirdweb/react";
import { BaseLayout } from "./components/Layout/BaseLayout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { ThirdwebWalletSync } from "./components/ThirdwebWalletSync";
import NotFound from "./pages/NotFound";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const TrackRecordPage = lazy(() => import("./pages/TrackRecordPage"));
const HowItWorksPage = lazy(() => import("./pages/HowItWorksPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ApiAccessPage = lazy(() => import("./pages/ApiAccessPage"));
const PicksPage = lazy(() => import("./pages/PicksPage"));
const MatchesPage = lazy(() => import("./pages/MatchesPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));

const queryClient = new QueryClient();

const App = () => (
  <ThirdwebProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <Toaster />
          <Sonner />
          <ThirdwebWalletSync />

          <BrowserRouter>
            <BaseLayout>
              <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading..." /></div>}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/picks" element={<PicksPage />} />
                  <Route path="/matches" element={<MatchesPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/track-record" element={<TrackRecordPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/dashboard/settings" element={<SettingsPage />} />
                  <Route path="/dashboard/api" element={<ApiAccessPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BaseLayout>
          </BrowserRouter>
        </TooltipProvider>
    </QueryClientProvider>
  </ThirdwebProvider>
);

export default App;
