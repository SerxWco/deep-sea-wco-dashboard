import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TradingViewChart } from "@/components/TradingViewChart";
import Dashboard from "./pages/Dashboard";
import OceanCreatures from "./pages/OceanCreatures";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Route path="/trading" element={
            <DashboardLayout>
              <TradingViewChart />
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
              <div className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Tokens</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/whales" element={
            <DashboardLayout>
              <div className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Whale Tracker</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/info" element={
            <DashboardLayout>
              <div className="p-6 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">WCO Info</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;