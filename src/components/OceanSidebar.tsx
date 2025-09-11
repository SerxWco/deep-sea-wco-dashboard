import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Fish, 
  PieChart, 
  Coins, 
  Waves, 
  Info, 
  Heart
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
      <div className="p-6 border-b border-sidebar-border/30 bg-sidebar-accent/20">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img 
              src={wcoLogo} 
              alt="WCO Ocean Hub" 
              className="h-16 w-auto glow-intense hover:scale-110 transition-bounce"
            />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1 text-xs text-success ml-2">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span>Live</span>
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

      </SidebarContent>
    </Sidebar>
  );
}