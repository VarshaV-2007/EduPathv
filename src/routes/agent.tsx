import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, CheckCircle2, Loader2, Pencil, Route as RouteIcon, Sparkles, TrendingUp, Target, ClipboardList, Map } from "lucide-react";
import { toast } from "sonner";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { generateLearningPlan } from "@/lib/edupath.functions";
import { setAnalysis, useEduPath } from "@/lib/edupath-store";
import { progressStats } from "@/lib/edupath-types";

export const Route = createFileRoute("/agent")({ component: AgentPage });

const workflow = [
  { title: "Analyze", icon: ClipboardList, body: "Extracts and interprets the learner details exactly as entered." },
  { title: "Identify gaps", icon: Target, body: "Compares current evidence with the target role and explains the missing capabilities." },
  { title: "Plan & adapt", icon: Map, body: "Builds an ordered roadmap around the learner's time, experience, skills and goals." },
  { title: "Progress loop", icon: TrendingUp, body: "Uses module status and learner notes as new evidence for future adaptations." },
  { title: "Coach context", icon: Bot, body: "Keeps the learner profile, gaps, roadmap and progress available to the coach." },
];

function AgentPage() {
  const navigate = useNavigate();
  const state = useEduPath();
  const generate = useServerFn(generateLearningPlan);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(0);
  const [requestedStage, setRequestedStage] = useState<number | null>(null);
  const stats = progressStats(state.analysis, state.progress);

  useEffect(() => {
    const raw = sessionStorage.getItem("edupath-agent-stage");
    const requested = raw === null ? 0 : Number(raw);
    const safeStage = Number.isInteger(requested) && requested >= 0 && requested < workflow.length ? requested : 0;
    setStage(safeStage);
    setRequestedStage(safeStage);
    sessionStorage.removeItem("edupath-agent-stage");
  }, []);

  useEffect(() => {
    if (!state.profile || state.analysis || running || requestedStage === null) return;
    setRunning(true);
    setStage(requestedStage);
    void (async () => {
      try {
        const result = await generate({ data: state.profile! });
        setAnalysis(result);
        setStage(requestedStage);
        toast.success("Agentic analysis completed.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The agent could not complete the analysis.");
      } finally {
        setRunning(false);
      }
    })();
  }, [state.profile, state.analysis, running, generate, requestedStage]);

  if (!state.profile) {
    return <AppShell><EmptyState title="Start with your learner profile" body="Enter your role, target career, skills and learning constraints first." cta={<Button asChild><Link to="/">Create profile</Link></Button>} /></AppShell>;
  }

  const profileRows = [
    ["Name", state.profile.name || "Not provided"],
    ["Current role / studies", state.profile.currentRole || "Not provided"],
    ["Target career", state.profile.goalRole || "Not provided"],
    ["Experience", `${state.profile.experienceYears} ${state.profile.experienceYears === 1 ? "year" : "years"}`],
    ["Timeline", `${state.profile.timelineMonths} months`],
    ["Study time", `${state.profile.hoursPerWeek} hours/week`],
    ["Skills", state.profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ") || "None entered"],
    ["Interests / constraints", state.profile.interests || "Not provided"],
    ["Resume / background", state.profile.resumeText ? `${state.profile.resumeText.slice(0, 500)}${state.profile.resumeText.length > 500 ? "…" : ""}` : "Not provided"],
  ];

  const selectedStage = Math.min(stage, workflow.length - 1);

  return <AppShell>
    <SectionTitle
      title="EduPath Agent"
      subtitle={state.analysis ? `Live learner workflow for ${state.profile.goalRole || "your target career"}.` : "Fast agentic extraction, gap detection and roadmap planning from your learner details."}
      action={<Button variant="outline" onClick={() => navigate({ to: "/" })}><Pencil className="size-4" /> Edit profile</Button>}
    />

    <section className="surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">Agentic workflow</p><p className="text-sm text-muted-foreground">Select a stage to inspect the information and answer produced from your profile.</p></div>
        {running ? <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"><Loader2 className="size-3.5 animate-spin" /> Gemini working</span> : <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"><CheckCircle2 className="size-3.5" /> Synced</span>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {workflow.map((item, index) => {
          const Icon = item.icon;
          const complete = Boolean(state.analysis) && index <= 2;
          return <button key={item.title} type="button" onClick={() => setStage(index)} className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${selectedStage === index ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-white/60"}`}>
            <div className="flex items-center gap-2"><span className={`flex size-8 items-center justify-center rounded-full ${complete ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{complete ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}</span><span className="text-sm font-semibold">{item.title}</span></div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.body}</p>
          </button>;
        })}
      </div>
    </section>

    <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.45fr]">
      <section className="surface p-5">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot className="size-5" /></span><div><p className="font-semibold">Extracted learner details</p><p className="text-xs text-muted-foreground">Source data used by every agent stage</p></div></div>
        <div className="mt-5 space-y-3">{profileRows.map(([label, value]) => <div key={label} className="rounded-lg bg-secondary/45 p-3"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm whitespace-pre-wrap">{value}</p></div>)}</div>
      </section>

      <section className="surface p-5">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-5" /></span><div><p className="font-semibold">{workflow[selectedStage].title}</p><p className="text-xs text-muted-foreground">{workflow[selectedStage].body}</p></div></div>
        {running ? <div className="mt-8 rounded-xl bg-secondary/40 p-6 text-center"><Loader2 className="mx-auto size-7 animate-spin text-primary" /><p className="mt-3 font-medium">Gemini is generating your personalized path…</p><p className="mt-1 text-sm text-muted-foreground">The response is generated from the details shown on this page.</p></div> : state.analysis ? <StageAnswer stage={selectedStage} state={state} stats={stats} /> : <div className="mt-6 rounded-xl bg-secondary/40 p-5 text-sm text-muted-foreground">Your learner details are extracted. The personalized analysis will appear here as soon as Gemini finishes.</div>}
      </section>
    </div>

    {state.analysis && <section className="mt-5 surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Next actions</p><p className="text-sm text-muted-foreground">Continue directly from the agent result.</p></div><div className="flex flex-wrap gap-2"><Button asChild><Link to="/dashboard"><TrendingUp className="size-4" /> Dashboard</Link></Button><Button asChild variant="secondary"><Link to="/roadmap"><RouteIcon className="size-4" /> Roadmap</Link></Button><Button asChild variant="outline"><Link to="/coach"><Sparkles className="size-4" /> Coach</Link></Button></div></div></section>}
  </AppShell>;
}

function StageAnswer({ stage, state, stats }: { stage: number; state: ReturnType<typeof useEduPath>; stats: ReturnType<typeof progressStats> }) {
  if (!state.analysis) return null;
  if (stage === 0) return <div className="mt-5 space-y-4"><AnswerBox title="Profile extraction" text={`EduPath identified ${state.profile?.skills.length ?? 0} skill(s), ${state.profile?.experienceYears ?? 0} year(s) of experience, a ${state.profile?.timelineMonths ?? 0}-month timeline and ${state.profile?.hoursPerWeek ?? 0} study hours/week for the target role ${state.profile?.goalRole || "not provided"}.`} /><AnswerList title="How the agent interpreted the learner" items={[state.analysis.summary, ...state.analysis.strengths.slice(0, 3)]} /></div>;
  if (stage === 1) return <div className="mt-5 space-y-4"><AnswerList title="Detected strengths" items={state.analysis.strengths} /><div><p className="text-sm font-semibold">Skill gaps</p><div className="mt-2 space-y-2">{state.analysis.gaps.map(g => <div key={g.skill} className="rounded-lg bg-secondary/45 p-3"><p className="font-medium">{g.skill}</p><p className="mt-1 text-sm text-muted-foreground">{g.currentLevel}/5 → {g.targetLevel}/5 · {g.importance} · {g.why}</p></div>)}</div></div></div>;
  if (stage === 2) return <div className="mt-5 space-y-4"><AnswerBox title="Personalized plan" text={state.analysis.summary} /><div className="grid gap-3 sm:grid-cols-2">{state.analysis.phases.map((phase, i) => <div key={phase.id} className="rounded-xl bg-secondary/45 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Phase {i + 1} · {phase.durationWeeks} weeks</p><p className="mt-1 font-semibold">{phase.title}</p><p className="mt-1 text-sm text-muted-foreground">{phase.focus}</p><ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{phase.modules.slice(0, 4).map(m => <li key={m.id}>{m.title}</li>)}</ul></div>)}</div></div>;
  return <div className="mt-5 space-y-4"><AnswerBox title="Progress loop" text={`${stats.done}/${stats.total} modules complete (${stats.percent}%). The roadmap can be adapted using the statuses and notes you provide.`} /><AnswerList title="Current evidence" items={[`${stats.doing} module(s) in progress`, `${stats.stuck} module(s) marked stuck`, state.analysis.adaptationNote || "No adaptation note yet."]} /></div>;
}

function AnswerBox({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="font-semibold">{title}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>; }
function AnswerList({ title, items }: { title: string; items: string[] }) { return <div><p className="text-sm font-semibold">{title}</p><ul className="mt-2 space-y-2">{items.map((item, i) => <li key={`${item}-${i}`} className="rounded-lg bg-secondary/45 p-3 text-sm">{item}</li>)}</ul></div>; }
