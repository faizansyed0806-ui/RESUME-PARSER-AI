import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { FileText, TrendingUp, Sparkles, Award, Upload } from "lucide-react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, sub }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className="size-4 text-primary-glow" />
      </div>
      <div className="mt-3 text-3xl font-display font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const candidates = JSON.parse(localStorage.getItem('candidates') || '[]');
    
    let totalScore = 0;
    const skillCounts: Record<string, number> = {};
    
    candidates.forEach((c: any) => {
      totalScore += c.resume_score || 0;
      (c.skills || []).forEach((s: string) => {
        skillCounts[s] = (skillCounts[s] || 0) + 1;
      });
    });

    const topSkills = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const ranking = [...candidates]
      .sort((a: any, b: any) => (b.resume_score || 0) - (a.resume_score || 0))
      .map((c: any) => ({ name: c.name || "Unknown", score: c.resume_score || 0 }))
      .slice(0, 10);

    setData({
      total: candidates.length,
      avgScore: candidates.length > 0 ? Math.round(totalScore / candidates.length) : 0,
      topSkills,
      ranking,
      recent: candidates.slice(0, 5)
    });
  }, []);

  const isLoading = !data;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your AI-powered hiring overview.</p>
        </div>
        <Button onClick={() => navigate({ to: "/upload" })} className="bg-gradient-primary shadow-glow">
          <Upload className="size-4 mr-2" /> Upload resume
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={FileText} label="Total resumes" value={data?.total ?? 0} />
          <Stat icon={TrendingUp} label="Avg score" value={`${data?.avgScore ?? 0}`} sub="out of 100" />
          <Stat icon={Sparkles} label="Unique skills" value={data?.topSkills?.length ?? 0} />
          <Stat icon={Award} label="Top score" value={data?.ranking?.[0]?.score ?? 0} sub={data?.ranking?.[0]?.name ?? "-"} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 shadow-card lg:col-span-2">
          <h2 className="font-display font-semibold mb-4">Candidate ranking</h2>
          <div className="h-72">
            {data?.ranking?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ranking}>
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.7 0.04 270)", fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "oklch(0.7 0.04 270)", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "oklch(0.20 0.05 270)", border: "1px solid oklch(0.30 0.05 270)", borderRadius: 8 }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {data.ranking.map((_: any, i: number) => (
                      <Cell key={i} fill={`oklch(0.62 0.22 ${275 - i * 5})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Upload a resume to see rankings.</div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 shadow-card">
          <h2 className="font-display font-semibold mb-4">Top skills</h2>
          <div className="flex flex-wrap gap-2">
            {data?.topSkills?.length ? data.topSkills.map((s: any) => (
              <span key={s.name} className="px-3 py-1.5 rounded-full text-xs bg-accent/40 border border-border">
                {s.name} <span className="text-muted-foreground ml-1">×{s.count}</span>
              </span>
            )) : <span className="text-sm text-muted-foreground">No data yet.</span>}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 shadow-card mt-6">
        <h2 className="font-display font-semibold mb-4">Recent uploads</h2>
        <div className="divide-y divide-border">
          {data?.recent?.length ? data.recent.map((c: any) => (
            <Link key={c.id} to="/candidates/$id" params={{ id: c.id }} className="flex items-center justify-between py-3 hover:bg-accent/20 -mx-2 px-2 rounded">
              <div>
                <div className="font-medium">{c.name ?? "Unknown"}</div>
                <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
              </div>
              <span className="text-sm font-mono px-2 py-0.5 rounded bg-gradient-primary text-primary-foreground">{c.resume_score}</span>
            </Link>
          )) : <span className="text-sm text-muted-foreground">No uploads yet.</span>}
        </div>
      </motion.div>
    </div>
  );
}
