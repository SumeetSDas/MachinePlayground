import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compileProblem, examples } from './problem';
import type { Interpretation } from './problem';
import { defaults } from '../machines';
import { useLab } from '../store';

function problem(patch: Partial<Interpretation> = {}): Interpretation { return { ...examples[0].interpretation, ...patch }; }

describe('problem compilation', () => {
  it('converts units and derives the answer and visual defaults without model arithmetic', () => {
    const result = compileProblem(problem());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.configuration.settings.loadArm).toBe(0.5);
    expect(result.configuration.settings.effortArm).toBe(1.5);
    expect(result.answer.value).toBeCloseTo(39.2);
    expect(result.visualDefaults.join(' ')).toContain('not a problem given');
    expect(result.highlight).toBe('effort');
  });
  it('solves the pulley work and Moon examples with explicit assumptions', () => {
    const work = compileProblem(examples[1].interpretation);
    const moon = compileProblem(examples[2].interpretation);
    expect(work.ok && work.answer.value).toBe(100);
    expect(work.ok && work.configuration.settings.efficiency).toBe(0.8);
    expect(moon.ok && moon.answer.value).toBeCloseTo(16.2);
  });
  it('requires essential givens instead of borrowing defaults', () => {
    const result = compileProblem(problem({ quantities: [] }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain('load arm, effort arm, mass or weight');
    expect(compileProblem(problem({ unknown: 'liftTime' })).ok).toBe(false);
  });
  it('rejects contradictory, incompatible, nonfinite, and unrepresentable quantities', () => {
    for (const extra of [
      { parameter: 'mass', value: 20, unit: 'kg' },
      { parameter: 'weight', value: 100, unit: 'N' },
      { parameter: 'radius', value: 0.3, unit: 'm' },
      { parameter: 'liftDistance', value: 2, unit: 'm' },
      { parameter: 'speed', value: 1, unit: 'N' },
      { parameter: 'speed', value: Number.NaN, unit: 'm/s' },
    ] as Interpretation['quantities']) {
      expect(compileProblem(problem({ quantities: [...problem().quantities, extra] })).ok).toBe(false);
    }
    expect(compileProblem({ ...problem(), execute: 'code' }).ok).toBe(false);
  });
  it('does not build a scene for clarification or unsupported concepts', () => {
    expect(compileProblem(problem({ status: 'clarification', question: 'How long is the arm?' })).ok).toBe(false);
    expect(compileProblem(problem({ status: 'unsupported', question: 'Acceleration is not modeled.' })).ok).toBe(false);
  });
  it('derives all supported unknowns from physics', () => {
    const quantities: Interpretation['quantities'] = [...problem().quantities, { parameter: 'liftDistance', value: 0.1, unit: 'm' }, { parameter: 'speed', value: 0.2, unit: 'm/s' }];
    for (const unknown of ['effort', 'weight', 'advantage', 'loadSpeed', 'inputPower', 'inputDistance', 'outputWork', 'liftTime'] as const) {
      const result = compileProblem(problem({ quantities, unknown }));
      expect(result.ok && Number.isFinite(result.answer.value)).toBe(true);
    }
  });
});

describe('agent scene lifecycle', () => {
  beforeEach(() => {
    useLab.getState().cancelProblem();
    useLab.setState({ machine: 'lever', settings: { lever: { ...defaults.lever }, pulley: { ...defaults.pulley } }, selected: null, running: true, resetKey: 0, error: null, problem: null, problemContext: null, problemStatus: 'idle', problemMessage: null, problemDraft: '', problemRevealed: false, history: [] });
    vi.restoreAllMocks();
  });
  it('applies and undoes an entire experiment, including switching machine', () => {
    const before = useLab.getState().settings;
    const updates: unknown[] = [];
    const unsubscribe = useLab.subscribe(state => updates.push(state));
    expect(useLab.getState().applyProblem('work', examples[1].interpretation, 'example')).toBe(true);
    unsubscribe();
    expect(updates).toHaveLength(1);
    expect(useLab.getState().machine).toBe('pulley');
    expect(useLab.getState().running).toBe(false);
    useLab.getState().revealProblem();
    expect(useLab.getState().problemRevealed).toBe(true);
    useLab.getState().undoProblem();
    expect(useLab.getState().machine).toBe('lever');
    expect(useLab.getState().settings).toBe(before);
    expect(useLab.getState().problem).toBeNull();
  });
  it('clears annotations and answers after valid manual edits', () => {
    useLab.getState().applyProblem('first', problem(), 'example');
    useLab.getState().revealProblem();
    useLab.getState().update('lever', { mass: 15 });
    expect(useLab.getState().problem).toBeNull();
    expect(useLab.getState().problemContext).toBeNull();
    expect(useLab.getState().problemRevealed).toBe(false);
    useLab.getState().undoProblem();
    expect(useLab.getState().settings.lever.mass).toBe(defaults.lever.mass);
  });
  it('keeps scene and prior result intact for a clarification or invalid response', () => {
    useLab.getState().applyProblem('first', problem(), 'example');
    const before = useLab.getState();
    expect(before.applyProblem('missing', problem({ quantities: [] }), 'ai')).toBe(false);
    expect(useLab.getState().settings).toBe(before.settings);
    expect(useLab.getState().problem).toBe(before.problem);
    expect(useLab.getState().problemStatus).toBe('clarification');
    expect(before.applyProblem('bad', { code: 'no' }, 'ai')).toBe(false);
    expect(useLab.getState().settings).toBe(before.settings);
  });
  it('handles unavailable credentials and does not mutate the experiment', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'AI not connected' }), { status: 503 })));
    const before = useLab.getState().settings;
    useLab.getState().setProblemDraft('a problem');
    await useLab.getState().submitProblem();
    expect(useLab.getState().problemMessage).toBe('AI not connected');
    expect(useLab.getState().settings).toBe(before);
    vi.unstubAllGlobals();
  });
  it('discards a response after manual settings change or cancellation', async () => {
    let deliver!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(resolve => { deliver = resolve; })));
    useLab.getState().setProblemDraft('problem');
    const pending = useLab.getState().submitProblem();
    useLab.getState().update('lever', { mass: 15 });
    deliver(new Response(JSON.stringify({ interpretation: problem() })));
    await pending;
    expect(useLab.getState().settings.lever.mass).toBe(15);
    expect(useLab.getState().problemMessage).toContain('experiment changed');
    const next = useLab.getState().submitProblem();
    useLab.getState().cancelProblem();
    deliver(new Response(JSON.stringify({ interpretation: problem() })));
    await next;
    expect(useLab.getState().problem).toBeNull();
    vi.unstubAllGlobals();
  });
  it('sends extracted context for follow-ups and limits undo history', async () => {
    for (let i = 0; i < 12; i++) useLab.getState().applyProblem('example', problem(), 'example');
    expect(useLab.getState().history).toHaveLength(10);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ interpretation: problem() })));
    vi.stubGlobal('fetch', fetchMock);
    useLab.getState().setProblemDraft('same problem, new load');
    await useLab.getState().submitProblem();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).context).toEqual(problem());
    useLab.getState().newProblem();
    expect(useLab.getState().problemContext).toBeNull();
    vi.unstubAllGlobals();
  });
});
