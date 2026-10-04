import { create } from 'zustand';
import { defaults } from './machines';
import type { MachineId, PartId, Settings } from './machines';
import { resolveExperiment } from './experiment';
import { compileProblem, interpretationSchema } from './agent/problem';
import type { CompiledProblem, Interpretation } from './agent/problem';
import { STATIC_DEMO } from './runtime';

interface ProblemSession { text: string; source: 'ai' | 'example'; result: CompiledProblem }
interface Snapshot { machine: MachineId | null; settings: Record<MachineId, Settings>; selected: PartId | null; running: boolean; problem: ProblemSession | null; context: Interpretation | null; revealed: boolean; draft: string }
let activeRequest: AbortController | null = null;

function readProgress(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('machine-playground-progress') || '[]');
    return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

interface LabState {
  machine: MachineId | null;
  settings: Record<MachineId, Settings>;
  selected: PartId | null;
  running: boolean;
  resetKey: number;
  completed: string[];
  error: string | null;
  problem: ProblemSession | null;
  problemContext: Interpretation | null;
  problemStatus: 'idle' | 'pending' | 'clarification' | 'error' | 'ready';
  problemMessage: string | null;
  problemDraft: string;
  problemRevealed: boolean;
  history: Snapshot[];
  requestId: number;
  setProblemDraft: (text: string) => void;
  submitProblem: () => Promise<void>;
  applyProblem: (text: string, interpretation: unknown, source: 'ai' | 'example') => boolean;
  cancelProblem: () => void;
  newProblem: () => void;
  undoProblem: () => void;
  revealProblem: () => void;
  open: (machine: MachineId | null) => void;
  update: (machine: MachineId, patch: Partial<Settings>) => void;
  applyExperiment: (machine: MachineId, patch: Partial<Settings>) => boolean;
  select: (part: PartId | null) => void;
  toggle: () => void;
  reset: () => void;
  complete: (id: string) => void;
}

export const useLab = create<LabState>((set, get) => ({
  machine: null,
  settings: { lever: { ...defaults.lever }, pulley: { ...defaults.pulley } },
  selected: null,
  running: true,
  resetKey: 0,
  completed: readProgress(),
  error: null,
  problem: null, problemContext: null, problemStatus: 'idle', problemMessage: null, problemDraft: '', problemRevealed: false, history: [], requestId: 0,
  setProblemDraft: problemDraft => set({ problemDraft }),
  submitProblem: async () => {
    if (STATIC_DEMO) {
      set({ problemStatus: 'error', problemMessage: 'This demo runs locally prepared examples only. Free-form AI problems require a server.' });
      return;
    }
    const before = get();
    const text = before.problemDraft.trim();
    if (!text || text.length > 2000) { set({ problemStatus: 'error', problemMessage: 'Enter a problem of 1–2000 characters.' }); return; }
    activeRequest?.abort();
    const controller = new AbortController();
    activeRequest = controller;
    const id = before.requestId + 1;
    set({ requestId: id, problemStatus: 'pending', problemMessage: null });
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/agent/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ problem: text, context: before.problemContext }) });
      const body: unknown = await response.json();
      if (get().requestId !== id) return;
      if (get().settings !== before.settings || get().machine !== before.machine || get().resetKey !== before.resetKey) throw new Error('The experiment changed while interpreting. Please submit again to use the latest scene.');
      if (!response.ok) throw new Error(typeof body === 'object' && body && 'error' in body && typeof body.error === 'string' ? body.error : 'The interpreter is unavailable. Your scene is unchanged.');
      get().applyProblem(text, typeof body === 'object' && body && 'interpretation' in body ? body.interpretation : null, 'ai');
    } catch (error) {
      if (get().requestId === id) set({ problemStatus: 'error', problemMessage: controller.signal.aborted ? 'The request timed out. Your scene is unchanged. Please retry.' : error instanceof Error ? error.message : 'Could not interpret the problem. Your scene is unchanged.' });
    } finally { clearTimeout(timeout); if (activeRequest === controller) activeRequest = null; }
  },
  applyProblem: (text, raw, source) => {
    const compiled = compileProblem(raw);
    if (!compiled.ok) {
      const parsed = interpretationSchema.safeParse(raw);
      set({ problemStatus: compiled.kind === 'clarification' ? 'clarification' : 'error', problemMessage: compiled.message, problemContext: parsed.success && compiled.kind === 'clarification' ? parsed.data : null });
      return false;
    }
    const state = get();
    const snapshot: Snapshot = { machine: state.machine, settings: state.settings, selected: state.selected, running: state.running, problem: state.problem, context: state.problemContext, revealed: state.problemRevealed, draft: state.problemDraft };
    const { machine, settings } = compiled.configuration;
    set({ machine, settings: { ...state.settings, [machine]: settings }, error: null, selected: null, running: false, resetKey: state.resetKey + 1, problem: { text, source, result: compiled }, problemContext: compiled.interpretation, problemStatus: 'ready', problemMessage: null, problemDraft: '', problemRevealed: false, history: [...state.history.slice(-9), snapshot], requestId: state.requestId + 1 });
    return true;
  },
  cancelProblem: () => { activeRequest?.abort(); set(state => ({ requestId: state.requestId + 1, problemStatus: state.problem ? 'ready' : 'idle', problemMessage: null })); },
  newProblem: () => { get().cancelProblem(); set({ problemContext: null, problemDraft: '', problemStatus: 'idle', problemMessage: null }); },
  undoProblem: () => {
    get().cancelProblem();
    const state = get();
    const previous = state.history.at(-1);
    if (!previous) return;
    set({ machine: previous.machine, settings: previous.settings, selected: previous.selected, running: previous.running, problem: previous.problem, problemContext: previous.context, problemDraft: previous.draft, problemRevealed: previous.revealed, problemStatus: previous.problem ? 'ready' : 'idle', problemMessage: null, error: null, resetKey: state.resetKey + 1, history: state.history.slice(0, -1) });
  },
  revealProblem: () => set({ problemRevealed: true }),
  open: machine => { get().cancelProblem(); set({ machine, selected: null, error: null, running: true, resetKey: get().resetKey + 1, problem: null, problemContext: null, problemDraft: '', problemStatus: 'idle', problemRevealed: false }); },
  update: (machine, patch) => {
    const state = get();
    const current = state.settings[machine];
    const resolvedPatch = { ...patch };
    if (patch.gravity !== undefined && patch.mass === undefined && current.loadInput === 'weight') resolvedPatch.mass = current.mass * current.gravity / patch.gravity;
    const result = resolveExperiment(machine, resolvedPatch, current);
    if (!result.ok) { set({ error: result.errors.join(' ') }); return; }
    const restart = ['loadArm', 'effortArm', 'liftDistance', 'radius', 'segments'].some(key => key in patch);
    set({ settings: { ...state.settings, [machine]: result.configuration.settings }, error: null, problem: null, problemContext: null, problemRevealed: false, problemStatus: state.problemStatus === 'pending' ? 'pending' : 'idle', resetKey: state.resetKey + (restart ? 1 : 0), selected: patch.segments === 1 && state.selected === 'movable-wheel' ? null : state.selected });
  },
  applyExperiment: (machine, patch) => {
    const result = resolveExperiment(machine, patch);
    if (!result.ok) { set({ error: result.errors.join(' ') }); return false; }
    set(state => ({ machine, settings: { ...state.settings, [machine]: result.configuration.settings }, error: null, selected: null, running: false, resetKey: state.resetKey + 1 }));
    return true;
  },
  select: selected => set({ selected }),
  toggle: () => set(state => ({ running: !state.running })),
  reset: () => {
    const machine = get().machine;
    get().cancelProblem();
    if (machine) set(state => ({ settings: { ...state.settings, [machine]: { ...defaults[machine] } }, error: null, selected: null, running: true, problem: null, problemContext: null, problemStatus: 'idle', problemRevealed: false, resetKey: state.resetKey + 1 }));
  },
  complete: id => {
    if (get().completed.includes(id)) return;
    const completed = [...get().completed, id];
    try { localStorage.setItem('machine-playground-progress', JSON.stringify(completed)); } catch { /* Private browsing can disable storage. */ }
    set({ completed });
  },
}));
