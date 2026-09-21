import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Brain,
  FileUp,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Sparkle,
  Target,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractResumeText } from "@/lib/edupath.functions";
import { resetAll, setProfile, useEduPath, useHydrated } from "@/lib/edupath-store";
import { emptyProfile, type LearnerProfile, type SkillEntry } from "@/lib/edupath-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduPath — Build your personalized learning path" },
      {
        name: "description",
        content:
          "Tell EduPath your skills, experience and target career. The AI agent analyzes your capability, finds your gaps and builds an adaptive roadmap.",
      },
      { property: "og:title", content: "EduPath — Build your personalized learning path" },
      {
        property: "og:description",
        content:
          "AI skill analysis, gap detection and an adaptive learning roadmap for your target career.",
      },
    ],
  }),
  component: ProfilePage,
});

const steps = [
  { icon: Radar, title: "Analyze", body: "AI reads your skills, resume and experience." },
  { icon: Target, title: "Identify gaps", body: "Compared against your target career." },
  { icon: Brain, title: "Plan & adapt", body: "A roadmap that rewrites itself as you learn." },
];

const ROLE_SUGGESTIONS = [
  "Software Developer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "AI Engineer", "Machine Learning Engineer", "Data Scientist", "Data Analyst",
  "Generative AI Engineer", "Cloud Engineer", "DevOps Engineer", "Cybersecurity Analyst",
  "UI/UX Designer", "Product Designer", "Mobile App Developer", "Computer Science Student",
  "Final-year CS student", "B.E. Computer Science Student", "Software Engineering Student",
  "Web Developer", "Python Developer", "Java Developer", "DevOps Student", "Cloud Computing Student",
];

function ProfilePage() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const { profile, analysis } = useEduPath();
  const parseResume = useServerFn(extractResumeText);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<LearnerProfile>(profile ?? emptyProfile);
  const [skillDraft, setSkillDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (hydrated) setProfile(form);
  }, [form, hydrated]);

  if (hydrated && profile && !seeded) {
    setSeeded(true);
    setForm(profile);
  }

  const update = <K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addSkill = () => {
    const name = skillDraft.trim();
    if (!name) return;
    if (form.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkillDraft("");
      return;
    }
    update("skills", [...form.skills, { name, level: 3 }]);
    setSkillDraft("");
  };

  const updateSkill = (index: number, patch: Partial<SkillEntry>) =>
    update(
      "skills",
      form.skills.map((skill, i) => (i === index ? { ...skill, ...patch } : skill)),
    );

  const onFile = async (file: File) => {
    setParsing(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      buffer.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      const result = await parseResume({
        data: { fileName: file.name, base64: btoa(binary) },
      });
      if (!result.text) {
        toast.error("No readable text found in that file.");
      } else {
        update("resumeText", result.text);
        toast.success(`Loaded ${file.name}`);
      }
    } catch {
      toast.error("Could not read that file. Try pasting the text instead.");
    } finally {
      setParsing(false);
    }
  };

  const submit = async () => {
    if (!form.goalRole.trim()) {
      toast.error("Add the career or role you're aiming for.");
      return;
    }
    setLoading(true);
    setProfile(form);
    // The Agent page owns the Gemini workflow so the user immediately sees
    // the agentic stages instead of waiting on this form page.
    navigate({ to: "/agent" });
    setLoading(false);
  };

  return (
    <AppShell>
      <section className="mb-10 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkle className="size-3.5" /> Agentic learning platform
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl">
            <span className="text-gradient">Close the gap</span>
            <br />
            between where you are and the role you want.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            EduPath profiles your capability, detects the skills standing between you and your
            target career, and keeps rewriting your roadmap as you progress.
          </p>
        </div>
        <div className="grid gap-3">
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              className="surface flex w-full items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              onClick={() => {
                if (!profile?.goalRole?.trim()) {
                  toast.info("Complete your learner profile first.");
                  document.getElementById("learner-profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                sessionStorage.setItem("edupath-agent-stage", String(index));
                navigate({ to: "/agent" });
              }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <step.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2"><p className="font-medium">{step.title}</p><span className="text-xs text-muted-foreground">{index === 0 ? "Start here" : analysis ? "Open" : "Locked until analysis"}</span></div>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section id="learner-profile" className="scroll-mt-24 surface p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Learner profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The more honest the detail, the sharper the gap analysis.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Your name">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Alex Doe"
            />
          </Field>
          <Field label="Current role or studies">
            <Select value={form.currentRole || undefined} onValueChange={(value) => update("currentRole", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your current role or studies" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_SUGGESTIONS.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Target career or role">
            <Select value={form.goalRole || undefined} onValueChange={(value) => update("goalRole", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your target career or role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_SUGGESTIONS.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Years of experience">
            <Select value={String(form.experienceYears)} onValueChange={(value) => update("experienceYears", Number(value))}>
              <SelectTrigger><SelectValue placeholder="Select years" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, year) => (
                  <SelectItem key={year} value={String(year)}>{year} {year === 1 ? "year" : "years"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Timeline (months)">
            <Input
              type="number"
              min={1}
              value={form.timelineMonths}
              onChange={(e) => update("timelineMonths", Number(e.target.value) || 1)}
            />
          </Field>
          <Field label="Study hours per week">
            <Input
              type="number"
              min={1}
              value={form.hoursPerWeek}
              onChange={(e) => update("hoursPerWeek", Number(e.target.value) || 1)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Label className="text-sm">Current skills</Label>
          <div className="mt-2 flex gap-2">
            <Input
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill, e.g. Python"
            />
            <Button type="button" variant="secondary" onClick={addSkill}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            {form.skills.map((skill, index) => (
              <div
                key={skill.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2"
              >
                <span className="min-w-32 flex-1 text-sm">{skill.name}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={skill.level}
                  onChange={(e) => updateSkill(index, { level: Number(e.target.value) })}
                  className="h-1 w-40 accent-[var(--color-primary)]"
                />
                <span className="w-16 text-right text-xs text-muted-foreground">
                  {skill.level}/5
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    update(
                      "skills",
                      form.skills.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {form.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Goals, interests and constraints">
            <Textarea
              rows={6}
              value={form.interests}
              onChange={(e) => update("interests", e.target.value)}
              placeholder="I want to work on computer vision, prefer hands-on projects, and can't study on weekdays before 7pm."
            />
          </Field>
          <Field label="Resume (optional)">
            <Textarea
              rows={6}
              value={form.resumeText}
              onChange={(e) => update("resumeText", e.target.value)}
              placeholder="Paste your resume or a background summary here…"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={parsing}
                onClick={() => fileRef.current?.click()}
              >
                {parsing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileUp className="size-4" />
                )}
                Upload PDF or text
              </Button>
              <span className="text-xs text-muted-foreground">or paste above</span>
            </div>
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={loading} onClick={submit}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Analyzing your profile…
              </>
            ) : (
              <>
                {analysis ? <RefreshCw className="size-4" /> : <Sparkle className="size-4" />}
                {analysis ? "Re-analyze and rebuild path" : "Analyze & build my path"}
              </>
            )}
          </Button>
          {analysis ? (
            <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
              Go to dashboard
            </Button>
          ) : null}
          {(profile || analysis) ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => {
                if (!window.confirm("Clear your saved EduPath profile, roadmap and progress?")) return;
                resetAll();
                setForm(emptyProfile);
                setSeeded(true);
                toast.success("Saved EduPath data cleared.");
              }}
            >
              Reset saved data
            </Button>
          ) : null}
          {loading ? (
            <span className="text-sm text-muted-foreground">
              This takes up to a minute — the agent is reasoning about your gaps.
            </span>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
