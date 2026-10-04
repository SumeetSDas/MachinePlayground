import { describe, expect, it } from 'vitest';
import { calculate, challenges, leverMotion, pulleyMotion, pulleyGeometry } from './physics';
import { defaults } from './machines';

describe('lever force and movement', () => {
  it('has equal force and speed with equal arms', () => {
    const result = calculate('lever', { ...defaults.lever, loadArm: 1.8, effortArm: 1.8 });
    expect(result.advantage).toBe(1);
    expect(result.effort).toBeCloseTo(98);
    expect(result.loadSpeed).toBeCloseTo(0.2);
  });
  it('trades force for distance and conserves ideal power', () => {
    const result = calculate('lever', { ...defaults.lever, loadArm: 0.72, effortArm: 2.88 });
    expect(result.advantage).toBe(4);
    expect(result.effort).toBeCloseTo(24.5);
    expect(result.loadSpeed).toBeCloseTo(0.05);
    expect(result.inputPower).toBeCloseTo(result.outputPower);
  });
  it('requires more effort when the load arm is longer', () => {
    const result = calculate('lever', { ...defaults.lever, loadArm: 2.7, effortArm: 0.9 });
    expect(result.effort).toBeCloseTo(294);
    expect(result.loadSpeed).toBeCloseTo(0.6);
  });
});

describe('pulley rope constraint', () => {
  it('only changes direction with one fixed pulley', () => {
    const result = calculate('pulley', defaults.pulley);
    expect(result.effort).toBeCloseTo(98);
    expect(result.loadSpeed).toBeCloseTo(0.2);
  });
  it('halves effort and speed with two supporting sections', () => {
    const result = calculate('pulley', { ...defaults.pulley, segments: 2 });
    expect(result.effort).toBeCloseTo(49);
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
    expect(challenges.lever[0].test({ ...defaults.lever, loadArm: 0.9, effortArm: 2.7 })).toBe(true);
    expect(challenges.lever[0].test({ ...defaults.lever, loadArm: 1.8, effortArm: 1.8 })).toBe(false);
    expect(challenges.pulley[1].test({ ...defaults.pulley, segments: 2 })).toBe(true);
    expect(challenges.pulley[1].test(defaults.pulley)).toBe(false);
  });
});

describe('exact problem parameters and motion', () => {
  it('solves the 12 kg, 0.5 m / 1.5 m lever at g = 9.8', () => {
    const settings = { ...defaults.lever, mass: 12, loadArm: 0.5, effortArm: 1.5, liftDistance: 0.1 };
    const result = calculate('lever', settings);
    expect(result.beamLength).toBe(2);
    expect(result.effort).toBeCloseTo(39.2);
    expect(result.inputDistance).toBeCloseTo(0.3);
    expect(result.outputWork).toBeCloseTo(11.76);
    const motion = leverMotion(settings, 1);
    expect(-Math.sin(motion.angle) * settings.loadArm).toBeCloseTo(settings.liftDistance);
    expect(motion.inputTravel).toBeCloseTo(result.inputDistance);
  });
  it('gravity changes force and power, not speed ratio', () => {
    const moon = calculate('pulley', { ...defaults.pulley, gravity: 1.62 });
    const earth = calculate('pulley', defaults.pulley);
    expect(moon.weight).toBeCloseTo(16.2);
    expect(moon.loadSpeed).toBe(earth.loadSpeed);
    expect(calculate('pulley', { ...defaults.pulley, gravity: 9.81 }).weight).toBeCloseTo(98.1);
  });
  it('variable efficiency accounts for both lost power and lost work', () => {
    const result = calculate('pulley', { ...defaults.pulley, segments: 2, liftDistance: 1.2, efficiency: 0.6, friction: true });
    expect(result.outputWork / result.inputWork).toBeCloseTo(0.6);
    expect(result.outputPower / result.inputPower).toBeCloseTo(0.6);
    expect(result.inputWork).toBeCloseTo(result.inputPower * result.liftTime);
  });
  it.each([1, 2] as const)('preserves rope length through the %s-section stroke', segments => {
    const settings = { ...defaults.pulley, segments, liftDistance: 2, radius: 0.5 };
    const g = pulleyGeometry(settings);
    const ropeLength = (fraction: number) => {
      const motion = pulleyMotion(settings, fraction);
      return segments === 1 ? g.fixedY - motion.loadY + g.fixedY - motion.handleY : g.frameHeight - 0.07 - motion.loadY + g.fixedY - motion.loadY + g.fixedY - motion.handleY;
    };
    expect(ropeLength(0)).toBeCloseTo(ropeLength(0.5));
    expect(ropeLength(0)).toBeCloseTo(ropeLength(1));
    const top = pulleyMotion(settings, 1);
    expect(top.handleY).toBeGreaterThan(0);
    expect(top.loadY + settings.radius * 2).toBeLessThan(g.fixedY);
  });
});
