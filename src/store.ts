import { create } from 'zustand';
import { defaults } from './machines';
import type { MachineId, PartId, Settings } from './machines';
import { resolveExperiment } from './experiment';

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
  open: machine => set({ machine, selected: null, error: null, running: true, resetKey: get().resetKey + 1 }),
  update: (machine, patch) => {
    const state = get();
    const current = state.settings[machine];
    const resolvedPatch = { ...patch };
    if (patch.gravity !== undefined && patch.mass === undefined && current.loadInput === 'weight') resolvedPatch.mass = current.mass * current.gravity / patch.gravity;
    const result = resolveExperiment(machine, resolvedPatch, current);
    if (!result.ok) { set({ error: result.errors.join(' ') }); return; }
    const restart = ['loadArm', 'effortArm', 'liftDistance', 'radius', 'segments'].some(key => key in patch);
    set({ settings: { ...state.settings, [machine]: result.configuration.settings }, error: null, resetKey: state.resetKey + (restart ? 1 : 0), selected: patch.segments === 1 && state.selected === 'movable-wheel' ? null : state.selected });
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
    if (machine) set(state => ({ settings: { ...state.settings, [machine]: { ...defaults[machine] } }, error: null, selected: null, running: true, resetKey: state.resetKey + 1 }));
  },
  complete: id => {
    if (get().completed.includes(id)) return;
    const completed = [...get().completed, id];
    try { localStorage.setItem('machine-playground-progress', JSON.stringify(completed)); } catch { /* Private browsing can disable storage. */ }
    set({ completed });
  },
}));
