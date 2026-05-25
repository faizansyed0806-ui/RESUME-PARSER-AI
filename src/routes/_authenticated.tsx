import { createFileRoute, redirect, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Upload, Users, Target, LogOut, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      if (!token) throw redirect({ to: "/login" });
    }
  },
  component: AuthLayout,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/match", label: "Job Match", icon: Target },
] as const;

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem("admin_token");
    document.cookie = "admin_token=; path=/; max-age=0";
    toast.success("Signed out");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8 px-2">
          <div className="size-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <FileText className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold text-gradient">Parsely</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-gradient-primary shadow-glow"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="size-4 relative" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Button variant="ghost" onClick={handleLogout} className="justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground">
          <LogOut className="size-4 mr-2" /> Sign out
        </Button>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center">
              <FileText className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-gradient">Parsely</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4" />
          </Button>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto p-2 border-b border-border bg-sidebar/50">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${active ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {item.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
