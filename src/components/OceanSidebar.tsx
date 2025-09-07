import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Fish, 
  PieChart, 
  Coins, 
  Waves, 
  Info, 
  Heart,
  TrendingUp
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
  { title: "Whale Tracker", url: "/whales", icon: Waves },
  { title: "WCO Info", url: "/info", icon: Info },
  { title: "Support Project", url: "/support", icon: Heart },
];

export function OceanSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className="border-r border-sidebar-border bg-depth-gradient">
      <div className="p-6 border-b border-sidebar-border/30">
        <div className="flex items-center gap-3">
          <img 
            src={wcoLogo} 
            alt="WCO Ocean Hub" 
            className="h-10 w-10 rounded-lg glow-aqua"
          />
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-foreground">WCO</h1>
              <p className="text-xs text-muted-foreground">Ocean Hub</p>
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