import { describe, expect, it } from 'vitest';
import { calculate, challenges } from './physics';
import { defaults } from './machines';

describe('lever force and movement', () => {
  it('has equal force and speed with equal arms', () => {
    const result = calculate('lever', { ...defaults.lever, pivot: 50 });
    expect(result.advantage).toBe(1);
    expect(result.effort).toBeCloseTo(98.1);
    expect(result.loadSpeed).toBeCloseTo(0.2);
  });
  it('trades force for distance and conserves ideal power', () => {
    const result = calculate('lever', { ...defaults.lever, pivot: 20 });
    expect(result.advantage).toBe(4);
    expect(result.effort).toBeCloseTo(24.525);
    expect(result.loadSpeed).toBeCloseTo(0.05);
    expect(result.inputPower).toBeCloseTo(result.outputPower);
  });
  it('requires more effort when the load arm is longer', () => {
    const result = calculate('lever', { ...defaults.lever, pivot: 75 });
    expect(result.effort).toBeCloseTo(294.3);
    expect(result.loadSpeed).toBeCloseTo(0.6);
  });
});

describe('pulley rope constraint', () => {
  it('only changes direction with one fixed pulley', () => {
    const result = calculate('pulley', defaults.pulley);
    expect(result.effort).toBeCloseTo(98.1);
    expect(result.loadSpeed).toBeCloseTo(0.2);
  });
  it('halves effort and speed with two supporting sections', () => {
    const result = calculate('pulley', { ...defaults.pulley, segments: 2 });
    expect(result.effort).toBeCloseTo(49.05);
    expect(result.loadSpeed).toBeCloseTo(0.1);
    expect(result.inputPower).toBeCloseTo(result.outputPower);
  });
  it('wheel radius changes spin speed, not mechanical advantage', () => {
    const small = calculate('pulley', { ...defaults.pulley, radius: 0.24 });
    const large = calculate('pulley', { ...defaults.pulley, radius: 0.4 });
    expect(small.advantage).toBe(large.advantage);
    expect(small.effort).toBe(large.effort);
    expect(small.wheelSpeed).toBeGreaterThan(large.wheelSpeed);
  });
});

describe('friction, load, and challenges', () => {
  it.each(['lever', 'pulley'] as const)('%s accounts for lost power without changing the speed ratio', machine => {
    const ideal = calculate(machine, defaults[machine]);
    const real = calculate(machine, { ...defaults[machine], friction: true });
    expect(real.effort).toBeCloseTo(ideal.effort / 0.8);
    expect(real.outputPower / real.inputPower).toBeCloseTo(0.8);
    expect(real.loadSpeed).toBe(ideal.loadSpeed);
  });
  it.each(['lever', 'pulley'] as const)('%s doubles effort for double mass', machine => {
    expect(calculate(machine, { ...defaults[machine], mass: 20 }).effort).toBeCloseTo(calculate(machine, defaults[machine]).effort * 2);
  });
  it('challenges have attainable targets and reject incorrect settings', () => {
    expect(challenges.lever[0].test({ ...defaults.lever, pivot: 25 })).toBe(true);
    expect(challenges.lever[0].test({ ...defaults.lever, pivot: 50 })).toBe(false);
    expect(challenges.pulley[1].test({ ...defaults.pulley, segments: 2 })).toBe(true);
    expect(challenges.pulley[1].test(defaults.pulley)).toBe(false);
  });
});
