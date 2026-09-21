import { useCallback, useSyncExternalStore } from "react";
import type {
  Analysis,
  ChatThread,
  EduPathState,
  LearnerProfile,
  ModuleStatus,
} from "./edupath-types";

const STATE_KEY = "edupath.state.v1";
const THREADS_KEY = "edupath.threads.v1";

const defaultState: EduPathState = {
  profile: null,
  analysis: null,
  progress: {},
  notes: "",
};

let state: EduPathState = defaultState;
let threads: ChatThread[] = [];
let hydrated = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const rawState = window.localStorage.getItem(STATE_KEY);
    if (rawState) state = { ...defaultState, ...(JSON.parse(rawState) as EduPathState) };
  } catch {
    state = defaultState;
  }
  try {
    const rawThreads = window.localStorage.getItem(THREADS_KEY);
    if (rawThreads) threads = JSON.parse(rawThreads) as ChatThread[];
  } catch {
    threads = [];
  }
}

function persistState() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function persistThreads() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): EduPathState {
  hydrate();
  return state;
}

function getThreadsSnapshot(): ChatThread[] {
  hydrate();
  return threads;
}

export function setProfile(profile: LearnerProfile) {
  state = { ...getState(), profile };
  persistState();
  emit();
}

export function setAnalysis(analysis: Analysis) {
  const current = getState();
  const validIds = new Set(analysis.phases.flatMap((p) => p.modules.map((m) => m.id)));
  const progress = Object.fromEntries(
    Object.entries(current.progress).filter(([id]) => validIds.has(id)),
  );
  state = { ...current, analysis, progress };
  persistState();
  emit();
}

export function setModuleStatus(moduleId: string, status: ModuleStatus) {
  const current = getState();
  state = { ...current, progress: { ...current.progress, [moduleId]: status } };
  persistState();
  emit();
}

export function setNotes(notes: string) {
  state = { ...getState(), notes };
  persistState();
  emit();
}

export function resetAll() {
  state = defaultState;
  threads = [];
  persistState();
  persistThreads();
  emit();
}

export function createThread(title = "New conversation"): ChatThread {
  const thread: ChatThread = {
    id: crypto.randomUUID(),
    title,
    updatedAt: Date.now(),
    messages: [],
  };
  threads = [thread, ...getThreadsSnapshot()];
  persistThreads();
  emit();
  return thread;
}

export function saveThread(id: string, messages: unknown[], title?: string) {
  threads = getThreadsSnapshot().map((thread) =>
    thread.id === id
      ? { ...thread, messages, updatedAt: Date.now(), title: title ?? thread.title }
      : thread,
  );
  persistThreads();
  emit();
}

export function deleteThread(id: string) {
  threads = getThreadsSnapshot().filter((thread) => thread.id !== id);
  persistThreads();
  emit();
}

const serverState = defaultState;
const serverThreads: ChatThread[] = [];

export function useEduPath() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getState,
    useCallback(() => serverState, []),
  );
  return snapshot;
}

export function useThreads() {
  return useSyncExternalStore(
    subscribe,
    getThreadsSnapshot,
    useCallback(() => serverThreads, []),
  );
}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
