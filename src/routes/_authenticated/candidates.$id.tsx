import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Phone, MapPin, Trash2, Download, CheckCircle, FileText, Type } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/candidates/$id")({
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [c, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const candidates = JSON.parse(localStorage.getItem('candidates') || '[]');
    const found = candidates.find((cand: any) => cand.id === id);
    setCandidate(found);
    setIsLoading(false);
  }, [id]);

  if (isLoading) return <div className="p-10 max-w-4xl mx-auto"><Skeleton className="h-96 rounded-xl" /></div>;
  if (!c) return <div className="p-10">Not found.</div>;

  const handleDelete = () => {
    if (!confirm("Delete this candidate?")) return;
    const candidates = JSON.parse(localStorage.getItem('candidates') || '[]');
    const newCandidates = candidates.filter((cand: any) => cand.id !== id);
    localStorage.setItem('candidates', JSON.stringify(newCandidates));
    toast.success("Deleted");
    navigate({ to: "/candidates" });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate({ to: "/candidates" })} className="mb-4 -ml-2 print-hidden">
        <ArrowLeft className="size-4 mr-2" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl shadow-card print-glass">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-display font-bold">{c.name ?? "Unknown"}</h1>
              <p className="text-muted-foreground mt-1">{c.title ?? "-"}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {c.email && <span className="flex items-center gap-1"><Mail className="size-3.5" />{c.email}</span>}
                {c.phone && <span className="flex items-center gap-1"><Phone className="size-3.5" />{c.phone}</span>}
                {c.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.location}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-3xl font-display font-bold text-gradient">{c.resume_score}</div>
                <div className="text-xs text-muted-foreground">Resume score</div>
              </div>
              <div className="flex gap-2 print-hidden">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                  <Download className="size-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {c.parsed_json?.ats_analysis && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Detailed ATS Report</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-accent/40 rounded-xl p-4 border border-border flex flex-col items-center justify-center text-center">
                  <FileText className="size-5 mb-2 text-primary" />
                  <div className="text-2xl font-bold">{c.parsed_json.ats_analysis.format_score}</div>
                  <div className="text-xs text-muted-foreground uppercase">Format & Structure</div>
                </div>
                <div className="bg-accent/40 rounded-xl p-4 border border-border flex flex-col items-center justify-center text-center">
                  <CheckCircle className="size-5 mb-2 text-success" />
                  <div className="text-2xl font-bold text-success">{c.parsed_json.ats_analysis.keyword_score}</div>
                  <div className="text-xs text-muted-foreground uppercase">Keyword Optimization</div>
                </div>
                <div className="bg-accent/40 rounded-xl p-4 border border-border flex flex-col items-center justify-center text-center">
                  <Type className="size-5 mb-2 text-warning" />
                  <div className="text-2xl font-bold text-warning">{c.parsed_json.ats_analysis.brevity_score}</div>
                  <div className="text-xs text-muted-foreground uppercase">Brevity & Clarity</div>
                </div>
              </div>
              {c.parsed_json.ats_analysis.feedback?.length > 0 && (
                <div className="bg-card/50 rounded-xl p-4 text-sm space-y-2 border border-border">
                  <strong className="block mb-2">AI Feedback:</strong>
                  <ul className="space-y-1">
                    {c.parsed_json.ats_analysis.feedback.map((f: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span> <span>{f}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {c.summary && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Summary</h3>
              <p className="text-sm leading-relaxed">{c.summary}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {(c.skills ?? []).map((s: string) => (
                  <span key={s} className="px-2 py-1 rounded text-xs bg-accent/40 border border-border">{s}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Certifications</h3>
              <ul className="text-sm space-y-1">
                {(c.certifications ?? []).map((s: string, i: number) => <li key={i}>- {s}</li>)}
                {(!c.certifications || c.certifications.length === 0) && <li className="text-muted-foreground">None listed</li>}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Experience</h3>
            <div className="space-y-3">
              {(c.experience ?? []).map((e: any, i: number) => (
                <div key={i} className="border-l-2 border-primary/40 pl-4">
                  <div className="font-medium">{e.role} {e.company && <span className="text-muted-foreground">/ {e.company}</span>}</div>
                  <div className="text-xs text-muted-foreground">{e.start} - {e.end}</div>
                  {e.description && <p className="text-sm mt-1">{e.description}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Education</h3>
            <div className="space-y-2">
              {(c.education ?? []).map((e: any, i: number) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{e.degree}{e.field && `, ${e.field}`}</span>
                  <span className="text-muted-foreground"> / {e.institution} {e.year && `(${e.year})`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
