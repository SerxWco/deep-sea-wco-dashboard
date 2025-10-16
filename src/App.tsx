import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import OceanCreatures from "./pages/OceanCreatures";
import Portfolio from "./pages/Portfolio";
import Tokens from "./pages/Tokens";
import Wave from "./pages/Wave";
import WSwap from "./pages/WSwap";
import WcoInfo from "./pages/WcoInfo";
import KrakenWatchlistPage from "./pages/KrakenWatchlist";
import AdminKnowledge from "./pages/AdminKnowledge";
import AdminCache from "./pages/AdminCache";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          } />
          <Route path="/creatures" element={
            <DashboardLayout>
              <OceanCreatures />
            </DashboardLayout>
          } />
          <Route path="/portfolio" element={
            <DashboardLayout>
              <Portfolio />
            </DashboardLayout>
          } />
          <Route path="/tokens" element={
            <DashboardLayout>
              <Tokens />
            </DashboardLayout>
          } />
          <Route path="/wave" element={
            <DashboardLayout>
              <Wave />
            </DashboardLayout>
          } />
          <Route path="/wswap" element={
            <DashboardLayout>
              <WSwap />
            </DashboardLayout>
          } />
          <Route path="/whales" element={
            <DashboardLayout>
              <KrakenWatchlistPage />
            </DashboardLayout>
          } />
          <Route path="/info" element={
            <DashboardLayout>
              <WcoInfo />
            </DashboardLayout>
          } />
          <Route path="/support" element={
            <DashboardLayout>
              <div className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Support Project</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/admin/knowledge" element={
            <DashboardLayout>
              <AdminKnowledge />
            </DashboardLayout>
          } />
          <Route path="/admin/cache" element={
            <DashboardLayout>
              <AdminCache />
            </DashboardLayout>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;