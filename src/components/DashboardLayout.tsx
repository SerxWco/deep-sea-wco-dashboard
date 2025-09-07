import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OceanSidebar } from "@/components/OceanSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-ocean-gradient">
        <OceanSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top header with sidebar trigger */}
          <header className="h-14 flex items-center border-b border-border/20 bg-background/10 backdrop-blur-md">
            <SidebarTrigger className="ml-4 text-foreground hover:text-accent transition-ocean" />
            <div className="ml-4">
              <h2 className="text-sm font-medium text-foreground">
                Ocean Analytics Dashboard
              </h2>
            </div>
          </header>
          
          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}