import { defaults } from './machines';
import type { MachineId, Settings } from './machines';
import { maxLift } from './physics';

export interface ExperimentConfiguration {
  machine: MachineId;
  settings: Settings;
}

/** SI normalization for future structured problem input; incompatible dimensions fail. */
export function toSI(value: number, unit: 'kg' | 'g' | 'N' | 'm' | 'cm' | 'mm' | 'm/s' | 'cm/s' | 'm/s²' | '%' | 'ratio', quantity: 'mass' | 'weight' | 'length' | 'speed' | 'gravity' | 'efficiency') {
  const units: Record<string, { quantity: string; factor: number }> = {
    kg: { quantity: 'mass', factor: 1 }, g: { quantity: 'mass', factor: 0.001 }, N: { quantity: 'weight', factor: 1 },
    m: { quantity: 'length', factor: 1 }, cm: { quantity: 'length', factor: 0.01 }, mm: { quantity: 'length', factor: 0.001 },
    'm/s': { quantity: 'speed', factor: 1 }, 'cm/s': { quantity: 'speed', factor: 0.01 }, 'm/s²': { quantity: 'gravity', factor: 1 },
    '%': { quantity: 'efficiency', factor: 0.01 }, ratio: { quantity: 'efficiency', factor: 1 },
  };
  const entry = units[unit];
  if (!Number.isFinite(value) || !entry || entry.quantity !== quantity) throw new Error(`Invalid ${quantity} quantity: ${value} ${unit}`);
  return value * entry.factor;
}

export function validateSettings(machine: MachineId, settings: Settings): string[] {
  const errors: string[] = [];
  const ranges: [keyof Settings, number, number, string][] = [
    ['mass', 0.01, 1000, 'Mass must be between 0.01 and 1000 kg.'],
    ['gravity', 0.1, 30, 'Gravity must be between 0.1 and 30 m/s².'],
    ['speed', 0.01, 2, 'Input speed must be between 0.01 and 2 m/s.'],
    ['efficiency', 0.1, 1, 'Efficiency must be between 10% and 100%.'],
    ['loadArm', 0.2, 3, 'Load arm must be between 0.2 and 3 m.'],
    ['effortArm', 0.2, 3, 'Effort arm must be between 0.2 and 3 m.'],
    ['radius', 0.1, 0.5, 'Wheel radius must be between 0.1 and 0.5 m.'],
    ['liftDistance', 0.01, 2, 'Lift distance must be between 0.01 and 2 m.'],
  ];
  for (const [key, min, max, message] of ranges) {
    const value = settings[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) errors.push(message);
  }
  if (settings.segments !== 1 && settings.segments !== 2) errors.push('Only one or two supporting rope sections are supported.');
  if (settings.loadInput !== 'mass' && settings.loadInput !== 'weight') errors.push('Load input must be mass or weight.');
  if (typeof settings.friction !== 'boolean') errors.push('Friction must be on or off.');
  if (machine === 'lever' && settings.liftDistance > maxLift(machine, settings) + 1e-9) errors.push(`This load arm can lift at most ${maxLift(machine, settings).toFixed(3)} m within the model’s 20° stroke. Reduce lift distance or increase the load arm.`);
  return errors;
}

/** Resolve completely before updating the store; no silent clamping or partial writes. */
export function resolveExperiment(machine: MachineId, patch: Partial<Settings>, base: Settings = defaults[machine]) {
  if (machine !== 'lever' && machine !== 'pulley') return { ok: false as const, errors: ['This machine is not supported.'] };
  const unknown = Object.keys(patch).filter(key => !(key in defaults[machine]));
  if (unknown.length) return { ok: false as const, errors: [`Unsupported parameters: ${unknown.join(', ')}.`] };
  const settings = { ...base, ...patch };
  const errors = validateSettings(machine, settings);
  return errors.length ? { ok: false as const, errors } : { ok: true as const, configuration: { machine, settings } };
}
