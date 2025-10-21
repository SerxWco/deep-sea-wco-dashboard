import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { OceanSidebar } from "@/components/OceanSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-ocean-gradient">
        <OceanSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Top header with sidebar trigger */}
          <header className="h-14 flex items-center justify-between border-b border-border/20 bg-background/10 backdrop-blur-md px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-foreground hover:text-accent transition-ocean" />
              <h2 className="text-sm font-medium text-foreground">
                Ocean Analytics Dashboard
              </h2>
            </div>
            
            {user && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut}
                  className="ml-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            )}
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