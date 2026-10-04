import type { MachineId, Settings } from './machines';

export const GRAVITY = 9.8;
export const MAX_LEVER_ANGLE = 0.35;

export function maxLift(machine: MachineId, settings: Settings) {
  return machine === 'lever' ? settings.loadArm * Math.sin(MAX_LEVER_ANGLE) : 2;
}

/** Quasi-static lifting: rigid beam, massless rope/wheels, and constant efficiency. */
export function calculate(machine: MachineId, settings: Settings) {
  const { loadArm, effortArm } = settings;
  const beamLength = loadArm + effortArm;
  const pivot = loadArm / beamLength * 100;
  const advantage = machine === 'lever' ? effortArm / loadArm : settings.segments;
  const efficiency = settings.friction ? settings.efficiency : 1;
  const weight = settings.mass * settings.gravity;
  const effort = weight / (advantage * efficiency);
  const loadSpeed = settings.speed / advantage;
  const inputPower = effort * settings.speed;
  const outputPower = weight * loadSpeed;
  const wheelSpeed = machine === 'pulley' ? settings.speed / settings.radius : 0;
  const inputDistance = settings.liftDistance * advantage;
  const outputWork = weight * settings.liftDistance;
  const inputWork = effort * inputDistance;
  const liftTime = settings.liftDistance / loadSpeed;
  return { loadArm, effortArm, beamLength, pivot, advantage, efficiency, weight, effort, loadSpeed, inputPower, outputPower, wheelSpeed, inputDistance, outputWork, inputWork, liftTime };
}

/** Pure kinematics shared with the scenes; each fraction is one lifting stroke. */
export function leverMotion(settings: Settings, fraction: number) {
  const lift = settings.liftDistance * fraction;
  return { lift, inputTravel: lift * settings.effortArm / settings.loadArm, angle: -Math.asin(lift / settings.loadArm) };
}

export function pulleyGeometry(settings: Settings) {
  const radius = settings.radius;
  const loadBaseY = settings.segments === 2 ? radius + 0.94 : 0.94;
  const inputDistance = settings.liftDistance * settings.segments;
  const handleBaseY = Math.max(2.35, inputDistance + 0.55);
  const fixedY = Math.max(2.95, loadBaseY + settings.liftDistance + radius * 2 + 0.2, handleBaseY + 0.5);
  const frameHeight = Math.max(3.55, fixedY + radius + 0.28);
  return { loadBaseY, handleBaseY, fixedY, frameHeight };
}

export function pulleyMotion(settings: Settings, fraction: number) {
  const geometry = pulleyGeometry(settings);
  const lift = settings.liftDistance * fraction;
  return { ...geometry, lift, loadY: geometry.loadBaseY + lift, handleY: geometry.handleBaseY - lift * settings.segments, fixedAngle: -lift * settings.segments / settings.radius, movingAngle: lift / settings.radius };
}

export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  success: string;
  test: (settings: Settings) => boolean;
}

export const challenges: Record<MachineId, Challenge[]> = {
  lever: [
    { id: 'lever-easier', title: 'Small push, big lift', prompt: 'Give the lever at least 3× mechanical advantage. Which way should the fulcrum move?', hint: 'A long effort arm and a short load arm make lifting easier. Try a fulcrum position of 25% or less.', success: 'You did it! Your effort arm is at least three times longer. You need less force, but your end travels farther.', test: s => calculate('lever', s).advantage >= 3 },
    { id: 'lever-faster', title: 'Need for speed', prompt: 'Make the load move faster than the effort pad. Keep the input speed at 0.20 m/s or less.', hint: 'Move the fulcrum toward the effort pad, past the middle. The load gets a longer arm, but you need more force.', success: 'The load moves faster! Its longer arm trades a faster lift for more input force.', test: s => s.loadArm > s.effortArm && s.speed <= 0.2 },
    { id: 'lever-balance', title: 'Meet in the middle', prompt: 'Make the ideal effort equal to the load’s weight. Turn off friction and find the balance point.', hint: 'Equal arm lengths give 1× mechanical advantage. Try a fulcrum position of 50%.', success: 'Equal arms, equal forces. The two ends also move at the same speed.', test: s => Math.abs(s.loadArm - s.effortArm) < 1e-9 && !s.friction },
  ],
  pulley: [
    { id: 'pulley-direction', title: 'A change of direction', prompt: 'Use one fixed wheel with no friction. Compare effort force with load weight.', hint: 'Select “One fixed wheel” and turn friction off. A fixed pulley lets you pull down to lift up.', success: 'Same force, new direction! One supporting rope section gives 1× mechanical advantage.', test: s => s.segments === 1 && !s.friction },
    { id: 'pulley-half', title: 'Share the heavy lifting', prompt: 'Make the ideal effort half the load’s weight. How many rope sections should support the load?', hint: 'Add a moving wheel, then turn off friction. Two rope sections can share the load.', success: 'Two sections share the weight. You need half the force, and must pull twice as much rope.', test: s => s.segments === 2 && !s.friction },
    { id: 'pulley-friction', title: 'Where did the energy go?', prompt: 'Try two wheels with friction on. Make the input power greater than the useful output power.', hint: 'Select the moving wheel arrangement and turn on friction. Choose an efficiency below 100%.', success: 'Some input work becomes heat in this model. Friction needs extra effort without changing the speed ratio.', test: s => s.segments === 2 && s.friction && s.efficiency < 1 },
  ],
};
