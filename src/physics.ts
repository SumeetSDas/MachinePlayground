import type { MachineId, Settings } from './machines';

export const GRAVITY = 9.81;
export const BEAM_LENGTH = 3.6;

/** Quasi-static lifting: rigid beam, massless rope/wheels, and constant efficiency. */
export function calculate(machine: MachineId, settings: Settings) {
  const loadArm = BEAM_LENGTH * settings.pivot / 100;
  const effortArm = BEAM_LENGTH - loadArm;
  const advantage = machine === 'lever' ? effortArm / loadArm : settings.segments;
  const efficiency = settings.friction ? 0.8 : 1;
  const weight = settings.mass * GRAVITY;
  const effort = weight / (advantage * efficiency);
  const loadSpeed = settings.speed / advantage;
  const inputPower = effort * settings.speed;
  const outputPower = weight * loadSpeed;
  const wheelSpeed = machine === 'pulley' ? settings.speed / settings.radius : 0;
  return { loadArm, effortArm, advantage, efficiency, weight, effort, loadSpeed, inputPower, outputPower, wheelSpeed };
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
    { id: 'lever-faster', title: 'Need for speed', prompt: 'Make the load move faster than the effort pad. Keep the input speed at 0.20 m/s or less.', hint: 'Move the fulcrum toward the effort pad, past the middle. The load gets a longer arm, but you need more force.', success: 'The load moves faster! Its longer arm trades a faster lift for more input force.', test: s => s.pivot > 50 && s.speed <= 0.2 },
    { id: 'lever-balance', title: 'Meet in the middle', prompt: 'Make the ideal effort equal to the load’s weight. Turn off friction and find the balance point.', hint: 'Equal arm lengths give 1× mechanical advantage. Try a fulcrum position of 50%.', success: 'Equal arms, equal forces. The two ends also move at the same speed.', test: s => s.pivot === 50 && !s.friction },
  ],
  pulley: [
    { id: 'pulley-direction', title: 'A change of direction', prompt: 'Use one fixed wheel with no friction. Compare effort force with load weight.', hint: 'Select “One fixed wheel” and turn friction off. A fixed pulley lets you pull down to lift up.', success: 'Same force, new direction! One supporting rope section gives 1× mechanical advantage.', test: s => s.segments === 1 && !s.friction },
    { id: 'pulley-half', title: 'Share the heavy lifting', prompt: 'Make the ideal effort half the load’s weight. How many rope sections should support the load?', hint: 'Add a moving wheel, then turn off friction. Two rope sections can share the load.', success: 'Two sections share the weight. You need half the force, and must pull twice as much rope.', test: s => s.segments === 2 && !s.friction },
    { id: 'pulley-friction', title: 'Where did the energy go?', prompt: 'Try two wheels with friction on. Make the input power greater than the useful output power.', hint: 'Select the moving wheel arrangement and turn on friction. Our friction model has 80% efficiency.', success: '20% of the input power becomes heat in this model. Friction needs extra effort without changing the speed ratio.', test: s => s.segments === 2 && s.friction },
  ],
};
