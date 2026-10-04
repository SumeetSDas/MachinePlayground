import { describe, expect, it, beforeEach } from 'vitest';
import { resolveExperiment, toSI } from './experiment';
import { defaults } from './machines';
import { useLab } from './store';

describe('unit normalization and input validation', () => {
  it('converts common classroom quantities to SI', () => {
    expect(toSI(500, 'g', 'mass')).toBe(0.5);
    expect(toSI(50, 'cm', 'length')).toBe(0.5);
    expect(toSI(20, 'cm/s', 'speed')).toBe(0.2);
    expect(toSI(80, '%', 'efficiency')).toBe(0.8);
    expect(() => toSI(10, 'N', 'mass')).toThrow();
  });
  it('rejects invalid and unsupported values without clamping', () => {
    expect(resolveExperiment('lever', { mass: -1 }).ok).toBe(false);
    expect(resolveExperiment('pulley', { efficiency: 0 }).ok).toBe(false);
    expect(resolveExperiment('lever', { gravity: Number.NaN }).ok).toBe(false);
    expect(resolveExperiment('lever', { loadArm: 0.2, liftDistance: 0.5 }).ok).toBe(false);
    expect(resolveExperiment('pulley', { unknown: 4 } as never).ok).toBe(false);
    expect(resolveExperiment('pulley', { segments: 3 } as never).ok).toBe(false);
  });
});

describe('atomic experiment updates', () => {
  beforeEach(() => { useLab.setState({ settings: { lever: { ...defaults.lever }, pulley: { ...defaults.pulley } }, error: null }); });
  it('holds entered weight constant when gravity changes', () => {
    useLab.getState().update('pulley', { loadInput: 'weight' });
    useLab.getState().update('pulley', { gravity: 1.62 });
    const settings = useLab.getState().settings.pulley;
    expect(settings.mass * settings.gravity).toBeCloseTo(98);
  });
  it('holds entered mass constant when gravity changes', () => {
    useLab.getState().update('pulley', { gravity: 1.62 });
    expect(useLab.getState().settings.pulley.mass).toBe(10);
  });
  it('applies a complete problem atomically and starts paused', () => {
    expect(useLab.getState().applyExperiment('lever', { mass: 12, loadArm: 0.5, effortArm: 1.5, liftDistance: 0.1 })).toBe(true);
    expect(useLab.getState().settings.lever.loadArm).toBe(0.5);
    expect(useLab.getState().running).toBe(false);
    const before = useLab.getState().settings.lever;
    expect(useLab.getState().applyExperiment('lever', { mass: 12, loadArm: 0.2, liftDistance: 1 })).toBe(false);
    expect(useLab.getState().settings.lever).toBe(before);
  });
});
