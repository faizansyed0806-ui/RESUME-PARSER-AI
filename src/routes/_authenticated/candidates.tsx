import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { Search, MapPin } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesPage,
});

function scoreColor(s: number) {
  if (s >= 75) return "bg-success text-success-foreground";
  if (s >= 50) return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
}

function CandidatesPage() {
  const [data, setData] = useState<any[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setData(JSON.parse(localStorage.getItem('candidates') || '[]'));
  }, []);

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((c: any) =>
      [c.name, c.email, c.title, c.location, ...(c.skills ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data, q]);

  const isLoading = data === null;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Candidates</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.length ?? 0} parsed resumes</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, skill, title..." className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-muted-foreground">
          {q ? "No matches." : "No candidates yet. Upload a resume to get started."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to="/candidates/$id" params={{ id: c.id }} className="block glass rounded-xl p-5 shadow-card hover:shadow-glow transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-semibold truncate">{c.name ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.title ?? c.email ?? "-"}</div>
                  </div>
                  <span className={`shrink-0 text-xs font-mono px-2 py-1 rounded ${scoreColor(c.resume_score)}`}>{c.resume_score}</span>
                </div>
                {c.location && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{c.location}</div>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {(c.skills ?? []).slice(0, 5).map((s: string) => (
                    <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-accent/40 border border-border">{s}</span>
                  ))}
                  {(c.skills?.length ?? 0) > 5 && (
                    <span className="px-2 py-0.5 rounded text-[11px] text-muted-foreground">+{c.skills.length - 5}</span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
