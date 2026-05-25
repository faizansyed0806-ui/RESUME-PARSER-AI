import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getServerEnv } from "./server-env";
const DEFAULT_AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_AI_MODEL = "gemini-3.1-flash-lite";

const ParsedResumeSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  years_experience: z.number().nullable().optional(),
  skills: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        institution: z.string().optional(),
        degree: z.string().optional(),
        field: z.string().optional(),
        year: z.string().optional(),
      }),
    )
    .default([]),
  experience: z
    .array(
      z.object({
        company: z.string().optional(),
        role: z.string().optional(),
        start: z.string().optional(),
        end: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
  ats_analysis: z.object({
    format_score: z.number(),
    keyword_score: z.number(),
    brevity_score: z.number(),
    overall_score: z.number(),
    feedback: z.array(z.string()),
  }).optional(),
});

async function callAI(messages: any[], tools?: any[], toolChoice?: any) {
  const GEMINI_API_KEY = await getServerEnv("GEMINI_API_KEY");
  
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY missing. Using mock AI response.");
    if (tools?.[0]?.function?.name === "save_resume") {
      return {
        choices: [{
          message: {
            tool_calls: [{
              function: {
                arguments: JSON.stringify({
                  name: "Mock Candidate (No API Key)",
                  email: "mock@example.com",
                  phone: "555-0000",
                  location: "Local Device",
                  title: "Software Engineer",
                  summary: "This is a mock parsed resume because the GEMINI_API_KEY environment variable was not found.",
                  years_experience: 4,
                  skills: ["React", "TypeScript", "Mock Data", "Tailwind CSS"],
                  education: [{ institution: "Localhost University", degree: "BS", field: "Computer Science", year: "2023" }],
                  experience: [{ company: "Demo Corp", role: "Frontend Developer", start: "2021", end: "Present", description: "Built mock interfaces." }],
                  certifications: ["Mock Certified Professional"],
                  ats_analysis: {
                    format_score: 85,
                    keyword_score: 90,
                    brevity_score: 75,
                    overall_score: 83,
                    feedback: ["Good use of keywords.", "Formatting could be cleaner.", "Try to be more concise in the experience section."]
                  }
                })
              }
            }]
          }
        }]
      };
    }
    
    if (tools?.[0]?.function?.name === "rank_candidates") {
      const candidatesRaw = messages[1]?.content?.split("Candidates (JSON):\n")[1];
      const candidates = candidatesRaw ? JSON.parse(candidatesRaw) : [];
      return {
        choices: [{
          message: {
            tool_calls: [{
              function: {
                arguments: JSON.stringify({
                  matches: candidates.map((c: any) => ({
                    candidate_id: c.id,
                    score: Math.floor(Math.random() * 40) + 60, // random 60-100
                    reasoning: "Mock reasoning because GEMINI_API_KEY is missing."
                  }))
                })
              }
            }]
          }
        }]
      };
    }
  }

  const apiBase = (await getServerEnv("AI_API_BASE")) ?? DEFAULT_AI_URL;
  const model = (await getServerEnv("AI_MODEL")) ?? DEFAULT_AI_MODEL;
  const body: any = { model, messages };
  if (tools) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }
  const res = await fetch(apiBase, {
    method: "POST",
    headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit hit. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Check your AI provider billing.");
    const txt = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

export const parseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; file_name?: string; resume_path?: string }) =>
    z
      .object({
        text: z.string().min(20).max(80_000),
        file_name: z.string().max(255).optional(),
        resume_path: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const tools = [
      {
        type: "function",
        function: {
          name: "save_resume",
          description: "Save structured resume data extracted from the text.",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              location: { type: "string" },
              title: { type: "string", description: "Most recent or target job title" },
              summary: { type: "string", description: "2-3 sentence professional summary" },
              years_experience: { type: "number" },
              skills: { type: "array", items: { type: "string" } },
              education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    institution: { type: "string" },
                    degree: { type: "string" },
                    field: { type: "string" },
                    year: { type: "string" },
                  },
                },
              },
              experience: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    company: { type: "string" },
                    role: { type: "string" },
                    start: { type: "string" },
                    end: { type: "string" },
                    description: { type: "string" },
                  },
                },
              },
              certifications: { type: "array", items: { type: "string" } },
              ats_analysis: {
                type: "object",
                description: "Analyze the resume as an ATS (Applicant Tracking System).",
                properties: {
                  format_score: { type: "number", description: "0-100 score on layout and structure" },
                  keyword_score: { type: "number", description: "0-100 score on use of industry keywords" },
                  brevity_score: { type: "number", description: "0-100 score on conciseness and clarity" },
                  overall_score: { type: "number", description: "0-100 combined ATS score" },
                  feedback: { type: "array", items: { type: "string" }, description: "3-5 bullet points of actionable feedback to improve ATS ranking" }
                },
                required: ["format_score", "keyword_score", "brevity_score", "overall_score", "feedback"]
              }
            },
            required: ["skills", "education", "experience", "certifications", "ats_analysis"],
          },
        },
      },
    ];

    const completion = await callAI(
      [
        {
          role: "system",
          content:
            "You are an expert ATS resume parser. Extract structured data from resumes accurately. Skills should be specific technologies, tools, and competencies. If unsure about a field, omit it. Always call the save_resume function.",
        },
        { role: "user", content: `Parse this resume:\n\n${data.text}` },
      ],
      tools,
      { type: "function", function: { name: "save_resume" } },
    );

    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured data");
    const parsed = ParsedResumeSchema.parse(JSON.parse(toolCall.function.arguments));

    // Scoring: we use the AI's ATS score if available, otherwise fallback heuristic
    const skillsScore = Math.min(parsed.skills.length * 4, 40);
    const expScore = Math.min((parsed.years_experience ?? parsed.experience.length * 2) * 4, 30);
    const eduScore = Math.min(parsed.education.length * 8, 20);
    const certScore = Math.min(parsed.certifications.length * 5, 10);
    const resume_score = parsed.ats_analysis?.overall_score ?? Math.round(skillsScore + expScore + eduScore + certScore);

    const newCandidate = {
      id: crypto.randomUUID(),
      name: parsed.name,
      title: parsed.title,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      summary: parsed.summary,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      certifications: parsed.certifications,
      years_experience: parsed.years_experience,
      parsed_json: parsed,
      resume_score,
      created_at: new Date().toISOString(),
    };

    return { success: true, candidate: newCandidate };
  });

export const matchCandidates = createServerFn({ method: "POST" })
  .inputValidator((d: { job_title: string; job_description: string; candidates: any[] }) => d)
  .handler(async (ctx) => {
    const { job_title, job_description, candidates } = ctx.data;

    if (!candidates || candidates.length === 0) {
      return { matches: [] };
    }

    const payload = candidates.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        title: c.title,
        location: c.location,
        skills: c.skills,
        years_experience: c.years_experience,
        summary: c.summary,
        education: c.education,
        certifications: c.certifications
    }));

    const tools = [
      {
        type: "function",
        function: {
          name: "rank_candidates",
          description: "Rank candidates against the job description.",
          parameters: {
            type: "object",
            properties: {
              matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    candidate_id: { type: "string" },
                    score: { type: "number", description: "0-100 match score" },
                    reasoning: { type: "string" },
                    matched_skills: { type: "array", items: { type: "string" } },
                    missing_skills: { type: "array", items: { type: "string" } },
                  },
                  required: ["candidate_id", "score", "reasoning"],
                },
              },
            },
            required: ["matches"],
          },
        },
      },
    ];

    const completion = await callAI(
      [
        {
          role: "system",
          content:
            "You are an expert technical recruiter. Score each candidate 0-100 against the job. Consider skills match, experience level, and relevance. Be strict and realistic.",
        },
        {
          role: "user",
          content: `Job title: ${job_title}\n\nJob description:\n${job_description}\n\nCandidates (JSON):\n${JSON.stringify(
            payload,
          )}`,
        },
      ],
      tools,
      { type: "function", function: { name: "rank_candidates" } },
    );

    const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not rank candidates");
    const result = JSON.parse(toolCall.function.arguments) as {
      matches: Array<{
        candidate_id: string;
        score: number;
        reasoning: string;
        matched_skills?: string[];
        missing_skills?: string[];
      }>;
    };

    return {
      matches: result.matches
        .map((m: any) => {
          const candidate = candidates.find((c: any) => c.id === m.candidate_id);
          return { ...m, candidate };
        })
        .filter((m: any) => m.candidate)
        .sort((a, b) => b.score - a.score),
    };
  });

export const listCandidates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const db = await readDB();
    
    const candidates = db.candidates
      .filter((c: any) => c.user_id === userId)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        title: c.title,
        location: c.location,
        resume_score: c.resume_score,
        skills: c.skills,
        years_experience: c.years_experience,
        created_at: c.created_at,
        file_name: c.file_name
      }))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { candidates };
  });

export const getCandidate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const db = await readDB();
    
    const row = db.candidates.find((c: any) => c.id === data.id && c.user_id === userId);
    
    if (!row) throw new Error("Candidate not found");
    return { candidate: row };
  });

export const deleteCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const db = await readDB();
    
    const initialLength = db.candidates.length;
    db.candidates = db.candidates.filter((c: any) => !(c.id === data.id && c.user_id === userId));
    
    if (db.candidates.length < initialLength) {
      await writeDB(db);
    }
    
    return { ok: true };
  });

export const dashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const db = await readDB();
    
    const candidates = db.candidates
      .filter((c: any) => c.user_id === userId)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        skills: c.skills,
        resume_score: c.resume_score,
        created_at: c.created_at
      }))
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const skillCounts = new Map<string, number>();
    for (const c of candidates) {
      const skills = (c.skills as string[]) ?? [];
      for (const s of skills) {
        const key = String(s).trim();
        if (!key) continue;
        skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
      }
    }
    const topSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const avgScore = candidates.length
      ? Math.round(candidates.reduce((s: number, c: any) => s + (c.resume_score ?? 0), 0) / candidates.length)
      : 0;

    const recent = candidates.slice(0, 5);
    const ranking = [...candidates]
      .sort((a: any, b: any) => (b.resume_score ?? 0) - (a.resume_score ?? 0))
      .slice(0, 8)
      .map((c: any) => ({ name: c.name ?? "Unknown", score: c.resume_score ?? 0 }));

    return {
      total: candidates.length,
      avgScore,
      topSkills,
      recent,
      ranking,
    };
  });
