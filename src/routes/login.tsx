import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      if (token) throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Fallback redirect if beforeLoad misses it
  useEffect(() => {
    if (localStorage.getItem("admin_token")) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(false);

    if (username === "admin" && password === "admin") {
      localStorage.setItem("admin_token", "true");
      document.cookie = "admin_token=true; path=/; max-age=31536000";
      toast.success("Welcome, Admin");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Invalid credentials (use admin/admin)");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,oklch(0.98_0.012_96),oklch(0.94_0.025_185)_48%,oklch(0.91_0.03_250))] px-4 py-8 text-foreground">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <section className="hidden lg:block">
          <div className="mb-8 flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileText className="size-5" />
            </div>
            <span className="text-2xl font-display font-bold">Parsely</span>
          </div>
          <h1 className="max-w-2xl text-5xl font-display font-bold leading-tight text-slate-950">
            Hire from structured resume intelligence.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
            Parse incoming resumes, score candidate strength, and compare talent against active roles from one focused workspace.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {["Parse", "Score", "Match"].map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white/70 p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-950">{label}</div>
                <div className="mt-1 h-1.5 rounded-full bg-primary/70" />
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/70">
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-4" />
            </div>
            <span className="text-xl font-display font-bold">Parsely</span>
          </div>
          <h1 className="mb-1 text-2xl font-semibold text-slate-950">Welcome</h1>
          <p className="mb-6 text-sm text-slate-500">
            Parse and score resumes with AI.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="admin" />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
