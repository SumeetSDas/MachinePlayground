import { create } from 'zustand';
import { defaults } from './machines';
import type { MachineId, PartId, Settings } from './machines';

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
  open: (machine: MachineId | null) => void;
  update: (machine: MachineId, patch: Partial<Settings>) => void;
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
  open: machine => set({ machine, selected: null, running: true, resetKey: get().resetKey + 1 }),
  update: (machine, patch) => set(state => ({
    settings: { ...state.settings, [machine]: { ...state.settings[machine], ...patch } },
    selected: patch.segments === 1 && state.selected === 'movable-wheel' ? null : state.selected,
  })),
  select: selected => set({ selected }),
  toggle: () => set(state => ({ running: !state.running })),
  reset: () => {
    const machine = get().machine;
    if (machine) set(state => ({ settings: { ...state.settings, [machine]: { ...defaults[machine] } }, selected: null, running: true, resetKey: state.resetKey + 1 }));
  },
  complete: id => {
    if (get().completed.includes(id)) return;
    const completed = [...get().completed, id];
    try { localStorage.setItem('machine-playground-progress', JSON.stringify(completed)); } catch { /* Private browsing can disable storage. */ }
    set({ completed });
  },
}));
