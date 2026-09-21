import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Send, UserRound } from "lucide-react";
import { AppShell, EmptyState, SectionTitle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEduPath } from "@/lib/edupath-store";
import { buildLearnerContext } from "@/lib/edupath-types";
import { coachResponse } from "@/lib/edupath.functions";
import { useServerFn } from "@tanstack/react-start";

type Message = { id: string; role: "user" | "assistant"; text: string };

export const Route = createFileRoute("/coach")({ component: CoachPage });

function CoachPage() {
  const state = useEduPath();
  const askCoach = useServerFn(coachResponse);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!state.profile) {
    return <AppShell><EmptyState title="Your AI coach needs your profile" body="Create your profile first so the coach can personalize its answers." cta={<Button asChild><Link to="/">Create profile</Link></Button>} /></AppShell>;
  }

  const send = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput("");
    setError("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: clean }]);
    setLoading(true);
    try {
      const result = await askCoach({ data: { context: buildLearnerContext(state), message: clean } });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return <AppShell>
    <SectionTitle title="AI Learning Coach" subtitle="Ask about your roadmap, skill gaps, projects, progress, or a difficult topic." />
    <div className="surface flex min-h-[65vh] flex-col overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && <div className="mx-auto max-w-xl py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot className="size-6" /></span>
          <h3 className="mt-4 text-lg font-semibold">What are you working on?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try asking: “Explain my biggest skill gap” or “Give me a 30-minute practice task for my current module.”</p>
        </div>}
        {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
          <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">{message.role === "user" ? <UserRound className="size-3" /> : <Bot className="size-3" />}{message.role === "user" ? "You" : "EduPath"}</div>
            <div className="whitespace-pre-wrap">{message.text}</div>
          </div>
        </div>)}
        {loading ? <div className="text-xs text-muted-foreground">EduPath is thinking…</div> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t border-border bg-background/70 p-4">
        <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask your learning coach…" disabled={loading} />
        <Button type="submit" disabled={!input.trim() || loading}><Send className="size-4" /><span className="hidden sm:inline">Send</span></Button>
      </form>
    </div>
  </AppShell>;
}
