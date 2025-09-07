import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Fish, 
  PieChart, 
  Coins, 
  Waves, 
  Info, 
  Heart,
  TrendingUp,
  BarChart3
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
  { title: "Trading Chart", url: "/trading", icon: BarChart3 },
  { title: "Ocean Creatures", url: "/creatures", icon: Fish },
  { title: "Portfolio", url: "/portfolio", icon: PieChart },
  { title: "Tokens", url: "/tokens", icon: Coins },
  { title: "Whale Tracker", url: "/whales", icon: Waves },
  { title: "WCO Info", url: "/info", icon: Info },
  { title: "Support Project", url: "/support", icon: Heart },
];

export function OceanSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border bg-depth-gradient">
      <div className="p-6 border-b border-sidebar-border/30 bg-sidebar-accent/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={wcoLogo} 
              alt="WCO Ocean Hub" 
              className="h-16 w-16 rounded-xl glow-intense hover:scale-110 transition-bounce"
            />
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent/40 rounded-xl blur opacity-75"></div>
          </div>
          {!collapsed && (
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">WCO</h1>
              <p className="text-sm text-accent font-medium">Ocean Hub</p>
              <div className="flex items-center gap-1 text-xs text-success">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          )}
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

        {!collapsed && (
          <div className="mt-8 p-4 glass-ocean rounded-lg mx-3">
            <div className="flex items-center gap-2 text-accent mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">WCO Price</span>
            </div>
            <p className="text-xl font-bold text-foreground">$0.0847</p>
            <p className="text-xs text-success">+12.5% (24h)</p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}