import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_token");
      if (token) throw redirect({ to: "/dashboard" });
      throw redirect({ to: "/login" });
    }
  },
});
