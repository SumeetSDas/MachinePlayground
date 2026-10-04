import { z } from 'zod';
import { defaults } from '../machines';
import type { PartId, Settings } from '../machines';
import { resolveExperiment, toSI } from '../experiment';
import { calculate, maxLift } from '../physics';

export const MAX_PROBLEM_LENGTH = 2000;
export const parameterSchema = z.enum(['mass', 'weight', 'gravity', 'loadArm', 'effortArm', 'liftDistance', 'speed', 'efficiency', 'radius', 'segments']);
export const unknownSchema = z.enum(['effort', 'weight', 'advantage', 'loadSpeed', 'inputPower', 'inputDistance', 'outputWork', 'liftTime']);
export const quantitySchema = z.strictObject({
  parameter: parameterSchema,
  value: z.number(),
  unit: z.enum(['kg', 'g', 'N', 'm', 'cm', 'mm', 'm/s', 'cm/s', 'm/s²', '%', 'ratio', 'count']),
});
/** Structured extraction only: no code, mesh instructions or model-computed answers. */
export const interpretationSchema = z.strictObject({
  status: z.enum(['ready', 'clarification', 'unsupported']),
  machine: z.enum(['lever', 'pulley']).nullable(),
  quantities: z.array(quantitySchema).max(10),
  unknown: unknownSchema.nullable(),
  question: z.string().max(600).nullable(),
});
export type Interpretation = z.infer<typeof interpretationSchema>;
export type Unknown = z.infer<typeof unknownSchema>;
export const requestSchema = z.strictObject({
  problem: z.string().trim().min(1).max(MAX_PROBLEM_LENGTH),
  context: interpretationSchema.nullable(),
});

export const unknownLabels: Record<Unknown, string> = {
  effort: 'Effort force', weight: 'Load weight', advantage: 'Mechanical advantage', loadSpeed: 'Load speed',
  inputPower: 'Input power', inputDistance: 'Input travel', outputWork: 'Useful work', liftTime: 'Lift time',
};
const quantityLabels: Record<z.infer<typeof parameterSchema>, string> = {
  mass: 'Mass', weight: 'Load weight', gravity: 'Gravity', loadArm: 'Load arm', effortArm: 'Effort arm',
  liftDistance: 'Lift distance', speed: 'Input speed', efficiency: 'Efficiency', radius: 'Wheel radius', segments: 'Supporting sections',
};
const dimensions = { mass: 'mass', weight: 'weight', gravity: 'gravity', loadArm: 'length', effortArm: 'length', liftDistance: 'length', speed: 'speed', efficiency: 'efficiency', radius: 'length' } as const;
const fmt = (value: number) => Number(value.toPrecision(6)).toString();

export function compileProblem(raw: unknown) {
  const parsed = interpretationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, kind: 'error' as const, message: 'The interpreter returned an invalid format. Your scene has not changed.' };
  const interpretation = parsed.data;
  if (interpretation.status !== 'ready') return { ok: false as const, kind: interpretation.status, message: interpretation.question || 'Please specify the machine, quantities, and what you want to find.', interpretation };
  if (!interpretation.machine || !interpretation.unknown) return { ok: false as const, kind: 'clarification' as const, message: 'Which machine and quantity should we solve for?', interpretation };
  const { machine, unknown } = interpretation;
  const values: Record<string, number> = {};
  const givens: string[] = [];
  try {
    for (const q of interpretation.quantities) {
      if (q.parameter in values) throw new Error(`Conflicting or repeated ${quantityLabels[q.parameter].toLowerCase()}. Please give one value.`);
      if (!Number.isFinite(q.value) || q.value <= 0) throw new Error(`${quantityLabels[q.parameter]} must be positive and finite.`);
      if (machine === 'lever' && ['radius', 'segments'].includes(q.parameter) || machine === 'pulley' && ['loadArm', 'effortArm'].includes(q.parameter)) throw new Error(`${quantityLabels[q.parameter]} does not belong to this machine.`);
      if (q.parameter === 'segments') {
        if (q.unit !== 'count' || ![1, 2].includes(q.value)) throw new Error('Only one fixed wheel or a fixed + moving wheel with two supporting sections is supported.');
        values.segments = q.value;
      } else {
        if (q.unit === 'count') throw new Error(`Incompatible units for ${quantityLabels[q.parameter]}.`);
        values[q.parameter] = toSI(q.value, q.unit, dimensions[q.parameter]);
      }
      givens.push(`${quantityLabels[q.parameter]}: ${q.value} ${q.unit === 'count' ? '' : q.unit}`.trim());
    }
  } catch (error) { return { ok: false as const, kind: 'clarification' as const, message: (error as Error).message, interpretation }; }
  const needed = machine === 'lever' ? ['loadArm', 'effortArm'] : ['segments'];
  if (values.mass === undefined && values.weight === undefined) needed.push('mass or weight');
  if (['loadSpeed', 'inputPower', 'liftTime'].includes(unknown)) needed.push('speed');
  if (['inputDistance', 'outputWork', 'liftTime'].includes(unknown)) needed.push('liftDistance');
  const missing = needed.filter(key => key === 'mass or weight' || values[key] === undefined);
  if (missing.length) return { ok: false as const, kind: 'clarification' as const, message: `Please provide ${missing.map(key => key === 'mass or weight' ? key : quantityLabels[key as keyof typeof quantityLabels].toLowerCase()).join(', ')}. I will keep the current scene until the problem is complete.`, interpretation };
  const assumptions = ['Rigid, massless machine; vertical forces; constant-speed lift.'];
  if (values.gravity === undefined) assumptions.push('Earth gravity assumed: g = 9.8 m/s².');
  if (values.efficiency === undefined) assumptions.push('Ideal machine assumed: 100% efficiency.');
  const gravity = values.gravity ?? 9.8;
  if (values.mass !== undefined && values.weight !== undefined && Math.abs(values.mass * gravity - values.weight) > Math.max(1e-6, values.weight * 1e-6)) return { ok: false as const, kind: 'clarification' as const, message: 'Mass and weight conflict with the supplied gravity. Which value should be used?', interpretation };
  const patch: Partial<Settings> = { ...values, gravity };
  delete (patch as Record<string, unknown>).weight;
  patch.mass = values.mass ?? values.weight / gravity;
  patch.loadInput = values.mass === undefined ? 'weight' : 'mass';
  patch.efficiency = values.efficiency ?? 1;
  patch.friction = patch.efficiency < 1;
  const visualDefaults: string[] = [];
  if (values.liftDistance === undefined) {
    patch.liftDistance = Math.min(0.1, maxLift(machine, { ...defaults[machine], ...patch }) * 0.8);
    visualDefaults.push(`Illustrative lift: ${fmt(patch.liftDistance)} m (not a problem given).`);
  }
  if (values.speed === undefined) { patch.speed = 0.2; visualDefaults.push('Illustrative input speed: 0.2 m/s (not a problem given).'); }
  if (machine === 'pulley' && values.radius === undefined) visualDefaults.push('Illustrative wheel radius: 0.32 m (does not change ideal advantage).');
  const resolved = resolveExperiment(machine, patch);
  if (!resolved.ok) return { ok: false as const, kind: 'clarification' as const, message: resolved.errors.join(' '), interpretation };
  const settings = resolved.configuration.settings;
  const result = calculate(machine, settings);
  const equations = {
    effort: { value: result.effort, unit: 'N', equation: `F = W / (MA × η) = ${fmt(result.weight)} / (${fmt(result.advantage)} × ${fmt(result.efficiency)})` },
    weight: { value: result.weight, unit: 'N', equation: `W = m × g = ${fmt(settings.mass)} × ${fmt(settings.gravity)}` },
    advantage: { value: result.advantage, unit: '×', equation: machine === 'lever' ? `MA = effort arm / load arm = ${fmt(settings.effortArm)} / ${fmt(settings.loadArm)}` : `MA = number of supporting rope sections = ${settings.segments}` },
    loadSpeed: { value: result.loadSpeed, unit: 'm/s', equation: `v(load) = v(input) / MA = ${fmt(settings.speed)} / ${fmt(result.advantage)}` },
    inputPower: { value: result.inputPower, unit: 'W', equation: `P(input) = F × v(input) = ${fmt(result.effort)} × ${fmt(settings.speed)}` },
    inputDistance: { value: result.inputDistance, unit: 'm', equation: `d(input) = lift × MA = ${fmt(settings.liftDistance)} × ${fmt(result.advantage)}` },
    outputWork: { value: result.outputWork, unit: 'J', equation: `Work(useful) = W × lift = ${fmt(result.weight)} × ${fmt(settings.liftDistance)}` },
    liftTime: { value: result.liftTime, unit: 's', equation: `t = lift / v(load) = ${fmt(settings.liftDistance)} / ${fmt(result.loadSpeed)}` },
  };
  return { ok: true as const, interpretation, configuration: resolved.configuration, givens, assumptions, visualDefaults, answer: { ...equations[unknown], label: unknownLabels[unknown] }, highlight: (['effort', 'inputPower'].includes(unknown) ? 'effort' : unknown === 'advantage' ? machine === 'lever' ? 'beam' : 'rope' : 'load') as PartId };
}
export type CompiledProblem = Extract<ReturnType<typeof compileProblem>, { ok: true }>;

export const examples: { id: string; title: string; problem: string; interpretation: Interpretation }[] = [
  { id: 'lever-effort', title: 'A little push', problem: 'An ideal lever lifts a 12 kg load. The load arm is 50 cm and the effort arm is 150 cm. Use g = 9.8 m/s². What effort force is needed?', interpretation: { status: 'ready', machine: 'lever', unknown: 'effort', question: null, quantities: [{ parameter: 'mass', value: 12, unit: 'kg' }, { parameter: 'loadArm', value: 50, unit: 'cm' }, { parameter: 'effortArm', value: 150, unit: 'cm' }, { parameter: 'gravity', value: 9.8, unit: 'm/s²' }] } },
  { id: 'pulley-work', title: 'Share the lift', problem: 'A fixed and moving pulley has two supporting rope sections. Lift a 100 N load through 1 m with 80% efficiency. How much useful work is done?', interpretation: { status: 'ready', machine: 'pulley', unknown: 'outputWork', question: null, quantities: [{ parameter: 'weight', value: 100, unit: 'N' }, { parameter: 'segments', value: 2, unit: 'count' }, { parameter: 'liftDistance', value: 1, unit: 'm' }, { parameter: 'efficiency', value: 80, unit: '%' }] } },
  { id: 'moon-pulley', title: 'A lift on the Moon', problem: 'On the Moon, g is 1.62 m/s². An ideal fixed pulley lifts a 10 kg load. What effort force is required?', interpretation: { status: 'ready', machine: 'pulley', unknown: 'effort', question: null, quantities: [{ parameter: 'mass', value: 10, unit: 'kg' }, { parameter: 'segments', value: 1, unit: 'count' }, { parameter: 'gravity', value: 1.62, unit: 'm/s²' }] } },
];
