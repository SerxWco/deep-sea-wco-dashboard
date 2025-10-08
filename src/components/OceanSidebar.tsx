import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Fish, 
  PieChart, 
  Coins, 
  Waves, 
  Info, 
  Zap,
  ArrowLeftRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import wcoLogo from "@/assets/wco-logo.png";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Ocean Creatures", url: "/creatures", icon: Fish },
  { title: "Portfolio", url: "/portfolio", icon: PieChart },
  { title: "Tokens", url: "/tokens", icon: Coins },
  { title: "WAVE", url: "/wave", icon: Waves },
  { title: "W-Swap", url: "/wswap", icon: ArrowLeftRight },
  { title: "Kraken Tracker", url: "/whales", icon: Zap },
  { title: "WCO Info", url: "/info", icon: Info },
];

export function OceanSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border bg-depth-gradient">
      <div className="relative p-3 border-b border-sidebar-border/30 bg-sidebar-accent/20 overflow-hidden">
        {/* Animated waves background */}
        <div className="absolute inset-0 opacity-30">
          <div className="wave-1 absolute top-1/2 left-0 w-full h-8 bg-gradient-to-r from-accent/40 via-primary/60 to-accent/40 rounded-full animate-wave-1"></div>
          <div className="wave-2 absolute top-1/2 left-0 w-full h-6 bg-gradient-to-r from-primary/30 via-accent/50 to-primary/30 rounded-full animate-wave-2"></div>
          <div className="wave-3 absolute top-1/2 left-0 w-full h-4 bg-gradient-to-r from-accent/20 via-primary/40 to-accent/20 rounded-full animate-wave-3"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center">
          <img 
            src="/lovable-uploads/383feda4-dfad-4b67-a364-3b2faa79a14b.png" 
            alt="WCO Ocean" 
            className="h-20 w-20 hover:scale-105 transition-bounce filter brightness-110 drop-shadow-lg"
          />
        </div>
      </div>

      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-ocean ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary glow-aqua"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}