import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Flame, Target, TrendingUp, Bot, Pencil } from "lucide-react";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useEduPath, useHydrated } from "@/lib/edupath-store";
import { progressStats } from "@/lib/edupath-types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduPath" },
      {
        name: "description",
        content: "See your skill profile, detected gaps and roadmap progress at a glance.",
      },
      { property: "og:title", content: "Dashboard — EduPath" },
      {
        property: "og:description",
        content: "Skill radar, gap severity and learning progress for your target career.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const hydrated = useHydrated();
  const { profile, analysis, progress } = useEduPath();
  const stats = progressStats(analysis, progress);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!profile) {
    return (
      <AppShell>
        <EmptyState
          title="No learner profile yet"
          body="Fill in your learner profile and EduPath will keep the details available across the dashboard, roadmap and coach."
          cta={<Button asChild><Link to="/">Start with your profile</Link></Button>}
        />
      </AppShell>
    );
  }

  if (!analysis) {
    return (
      <AppShell>
        <SectionTitle title={`${profile.name || "Your"} learning profile`} subtitle="Your latest entered details are saved and ready for Gemini analysis." action={<Button asChild><Link to="/">Analyze profile</Link></Button>} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="surface p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Current role / studies</p><p className="mt-2 font-medium">{profile.currentRole || "Not provided"}</p></div>
          <div className="surface p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Target career</p><p className="mt-2 font-medium">{profile.goalRole || "Not provided"}</p></div>
          <div className="surface p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Timeline</p><p className="mt-2 font-medium">{profile.timelineMonths} months · {profile.hoursPerWeek} h/week</p></div>
          <div className="surface p-5 md:col-span-2 lg:col-span-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Skills entered</p><div className="mt-3 flex flex-wrap gap-2">{profile.skills.length ? profile.skills.map((skill) => <span key={skill.name} className="rounded-full bg-secondary px-3 py-1 text-sm">{skill.name} · {skill.level}/5</span>) : <span className="text-sm text-muted-foreground">No skills entered yet.</span>}</div></div>
          <div className="surface p-5 md:col-span-2 lg:col-span-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Goals, interests and constraints</p><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{profile.interests || "Not provided"}</p></div>
        </div>
      </AppShell>
    );
  }

  const radarData = analysis.assessment.map((item) => ({
    skill: item.skill.length > 16 ? `${item.skill.slice(0, 15)}…` : item.skill,
    level: item.level,
  }));

  const gapData = analysis.gaps.map((gap) => ({
    skill: gap.skill.length > 16 ? `${gap.skill.slice(0, 15)}…` : gap.skill,
    current: gap.currentLevel,
    gap: Math.max(gap.targetLevel - gap.currentLevel, 0),
  }));

  return (
    <AppShell>
      <SectionTitle
        title={`${profile.name || "Your"} path to ${profile.goalRole}`}
        subtitle={analysis.summary}
        action={
          <div className="flex gap-2"><Button asChild variant="secondary"><Link to="/agent"><Bot className="size-4" /> Track progress</Link></Button><Button asChild variant="outline"><Link to="/"><Pencil className="size-4" /> Edit profile</Link></Button></div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="Path completion" value={`${stats.percent}%`} tone="primary" />
        <Stat icon={CheckCircle2} label="Modules done" value={`${stats.done}/${stats.total}`} tone="accent" />
        <Stat icon={Target} label="Critical gaps" value={String(analysis.gaps.filter((g) => g.importance === "critical").length)} tone="warning" />
        <Stat icon={Flame} label="Flagged difficult" value={String(stats.stuck)} tone="destructive" />
      </div>

      <div className="mt-6 surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold">Learner details</h3><p className="mt-1 text-sm text-muted-foreground">These details stay synchronized with your profile and power the agent.</p></div>
          <Button asChild variant="outline"><Link to="/"><Pencil className="size-4" /> Edit details</Link></Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Current role / studies" value={profile.currentRole || "Not provided"} />
          <Detail label="Experience" value={`${profile.experienceYears} ${profile.experienceYears === 1 ? "year" : "years"}`} />
          <Detail label="Timeline" value={`${profile.timelineMonths} months`} />
          <Detail label="Study time" value={`${profile.hoursPerWeek} hours/week`} />
          <Detail label="Skills" value={profile.skills.map((s) => `${s.name} (${s.level}/5)`).join(", ") || "None entered"} className="lg:col-span-2" />
          <Detail label="Interests / constraints" value={profile.interests || "Not provided"} className="lg:col-span-2" />
        </div>
      </div>

      <div id="gaps" className="mt-6 grid scroll-mt-24 gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h3 className="text-base font-semibold">Skill profile</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            AI-assessed capability across your current skills.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <Radar
                  dataKey="level"
                  stroke="var(--color-chart-1)"
                  fill="var(--color-chart-1)"
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="text-base font-semibold">Gap to target role</h3>
          <p className="mb-2 text-sm text-muted-foreground">
            Where you are now versus what {profile.goalRole} demands.
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapData} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="skill"
                  width={110}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-secondary)" }}
                  contentStyle={{
                    background: "var(--color-popover)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    color: "var(--color-popover-foreground)",
                  }}
                />
                <Bar dataKey="current" stackId="a" fill="var(--color-chart-2)" radius={[4, 0, 0, 4]} />
                <Bar dataKey="gap" stackId="a" fill="var(--color-chart-3)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <h3 className="mb-3 text-base font-semibold">Strengths</h3>
          <ul className="space-y-2 text-sm">
            {analysis.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-5">
          <h3 className="mb-3 text-base font-semibold">Risks to watch</h3>
          <ul className="space-y-2 text-sm">
            {analysis.risks.map((item) => (
              <li key={item} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-warning)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="surface p-5">
          <h3 className="mb-3 text-base font-semibold">Gap detail</h3>
          <ul className="space-y-3 text-sm">
            {analysis.gaps.map((gap) => (
              <li key={gap.skill}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{gap.skill}</span>
                  <ImportanceTag importance={gap.importance} />
                </div>
                <p className="text-muted-foreground">{gap.why}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`rounded-lg bg-secondary/45 p-3 ${className}`}><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></div>;
}

function ImportanceTag({ importance }: { importance: string }) {
  const tone =
    importance === "critical"
      ? "bg-destructive/15 text-destructive"
      : importance === "high"
        ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${tone}`}>
      {importance}
    </span>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  tone: "primary" | "accent" | "warning" | "destructive";
}) {
  const toneClass = {
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <div className="surface flex items-center gap-4 p-5">
      <span className={`flex size-11 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold">{value}</p>
      </div>
    </div>
  );
}
