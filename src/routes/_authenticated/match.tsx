import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Target, Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import React from "react";

import { matchCandidates } from "@/lib/resume.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/match")({
  component: MatchPage,
});

function scoreColor(s: number) {
  if (s >= 75) return "bg-success text-success-foreground";
  if (s >= 50) return "bg-warning text-warning-foreground";
  return "bg-destructive text-destructive-foreground";
}

function MatchPage() {
  const fn = useServerFn(matchCandidates);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const exportCSV = () => {
    if (!results) return;
    const headers = ["Rank", "Name", "Title", "Match Score", "Reasoning"];
    const rows = results.map((m, i) => [
      i + 1,
      `"${m.candidate?.name ?? "Unknown"}"`,
      `"${m.candidate?.title ?? ""}"`,
      m.score,
      `"${m.reasoning.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Job_Match_Results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("CSV Downloaded");
  };

  const exportPDF = () => {
    window.print();
  };

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    try {
      const candidates = JSON.parse(localStorage.getItem('candidates') || '[]');
      if (candidates.length === 0) {
        toast.error("You need to upload some resumes first!");
        setLoading(false);
        return;
      }
      const res = await fn({ data: { job_title: title, job_description: desc, candidates } });
      setResults(res.matches);
      if (!res.matches.length) toast.info("No candidates to rank yet.");
    } catch (err: any) {
      toast.error(err.message ?? "Match failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto print-p-0">
      <h1 className="text-3xl font-display font-bold">Job match</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6 print-hidden">Rank your candidates against a job description with AI.</p>

      <form onSubmit={handleMatch} className="glass rounded-2xl p-6 shadow-card space-y-4 print-hidden">
        <div>
          <Label htmlFor="title">Job title</Label>
          <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
        </div>
        <div>
          <Label htmlFor="desc">Job description</Label>
          <Textarea id="desc" required rows={8} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Paste the JD here..." />
        </div>
        <Button type="submit" disabled={loading} className="bg-gradient-primary shadow-glow">
          {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Target className="size-4 mr-2" />}
          Match candidates
        </Button>
      </form>

      {results && (
        <div className="mt-8 space-y-3 print-mt-0">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2 print-hidden">
            <h2 className="font-display font-semibold">Ranked candidates</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <FileSpreadsheet className="size-4 mr-2" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="size-4 mr-2" /> PDF
              </Button>
            </div>
          </div>
          
          <div className="space-y-3 p-1 print-p-0">
            {results.map((m, i) => (
            <motion.div key={m.candidate_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass rounded-xl p-5 shadow-card print-glass print-break-inside-avoid">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link to="/candidates/$id" params={{ id: m.candidate_id }} className="font-display font-semibold hover:underline">
                    #{i + 1} / {m.candidate?.name ?? "Unknown"}
                  </Link>
                  <div className="text-xs text-muted-foreground">{m.candidate?.title ?? ""}</div>
                  <p className="text-sm mt-2">{m.reasoning}</p>
                  {m.matched_skills?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.matched_skills.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-success/20 text-success border border-success/30">{s}</span>
                      ))}
                    </div>
                  )}
                  {m.missing_skills?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.missing_skills.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-destructive/15 text-destructive border border-destructive/30">missing: {s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`shrink-0 text-sm font-mono px-3 py-1.5 rounded ${scoreColor(m.score)}`}>{m.score}</span>
              </div>
            </motion.div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
