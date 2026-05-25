import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload as UploadIcon, Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { extractTextFromFile } from "@/lib/extract";
import { parseResume } from "@/lib/resume.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  component: UploadPage,
});

type FileStatus = {
  id: string;
  name: string;
  status: "pending" | "extracting" | "parsing" | "success" | "error";
  message?: string;
  candidateId?: string;
};

function UploadPage() {
  const navigate = useNavigate();
  const fn = useServerFn(parseResume);
  const [busy, setBusy] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const updateFileStatus = (id: string, updates: Partial<FileStatus>) => {
    setFileStatuses((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const onDrop = async (files: File[]) => {
    if (!files.length) return;
    setBusy(true);

    const initialStatuses = files.map((f) => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      status: "pending" as const,
    }));
    setFileStatuses((prev) => [...prev, ...initialStatuses]);

    let lastId: string | null = null;

    try {
      // Process sequentially to not overload the AI API, but could be Promise.all
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const statusId = initialStatuses[i].id;

        updateFileStatus(statusId, { status: "extracting", message: "Extracting text..." });
        const text = await extractTextFromFile(file);

        if (!text || text.length < 20) {
          updateFileStatus(statusId, { status: "error", message: "No text found. If this is a scanned image, please use a text-based PDF/DOCX." });
          continue;
        }

        updateFileStatus(statusId, { status: "parsing", message: "Parsing with AI..." });
        
        try {
          // Send text to stateless AI parser
          const res = await fn({ data: { text, file_name: file.name, resume_path: undefined } });
          const newCandidate = res.candidate;
          
          // Save permanently in the browser's local storage
          const existing = JSON.parse(localStorage.getItem('candidates') || '[]');
          localStorage.setItem('candidates', JSON.stringify([newCandidate, ...existing]));
          
          lastId = newCandidate.id;
          updateFileStatus(statusId, { status: "success", message: `Parsed - Score ${newCandidate.resume_score}`, candidateId: newCandidate.id });
        } catch (err: any) {
          updateFileStatus(statusId, { status: "error", message: err.message ?? "Failed to parse" });
        }
      }

      if (files.length === 1 && lastId) {
        navigate({ to: "/candidates/$id", params: { id: lastId } });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    multiple: true,
    disabled: busy,
  });

  const rootProps = getRootProps();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-display font-bold">Upload resumes</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">PDF, DOCX, or TXT. We extract, parse, score, and store.</p>

      <div {...rootProps}>
        <motion.div
          whileHover={{ scale: 1.005 }}
          className={`glass rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary shadow-glow" : "border-border"
          } ${busy ? "opacity-60 cursor-wait" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="size-16 mx-auto rounded-2xl bg-gradient-primary grid place-items-center shadow-glow mb-4">
            {busy ? <Loader2 className="size-7 animate-spin text-primary-foreground" /> : <UploadIcon className="size-7 text-primary-foreground" />}
          </div>
          <div className="text-lg font-display font-semibold">
            {busy ? "Processing files..." : isDragActive ? "Drop to upload" : "Drag & drop resumes here"}
          </div>
          <div className="text-sm text-muted-foreground mt-1">or click to browse</div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <FileText className="size-3" /> Multiple PDF / DOCX / TXT supported
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {fileStatuses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-3"
          >
            <h3 className="font-semibold mb-4">Upload Status</h3>
            {fileStatuses.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  {f.status === "pending" || f.status === "extracting" || f.status === "parsing" ? (
                    <Loader2 className="size-5 animate-spin text-primary shrink-0" />
                  ) : f.status === "success" ? (
                    <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="size-5 text-red-500 shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.message || "Pending..."}</p>
                  </div>
                </div>
                {f.candidateId && (
                  <button 
                    onClick={() => navigate({ to: "/candidates/$id", params: { id: f.candidateId! } })}
                    className="text-xs font-medium text-primary hover:underline whitespace-nowrap ml-4"
                  >
                    View Report
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
