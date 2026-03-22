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
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
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
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/picks" element={<PicksPage />} />
                  <Route path="/matches" element={<MatchesPage />} />
                  <Route path="/results" element={<ResultsPage />} />
                  <Route path="/stats" element={<StatsPage />} />
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
