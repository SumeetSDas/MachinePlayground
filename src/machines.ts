export type MachineId = 'lever' | 'pulley';
export type PartId = 'beam' | 'fulcrum' | 'load' | 'effort' | 'wheel' | 'movable-wheel' | 'rope' | 'axle' | 'bolt' | 'hook' | 'frame';

export interface Settings {
  mass: number;
  loadInput: 'mass' | 'weight';
  gravity: number;
  loadArm: number;
  effortArm: number;
  liftDistance: number;
  efficiency: number;
  speed: number;
  segments: 1 | 2;
  friction: boolean;
  radius: number;
}

export interface Part {
  id: PartId;
  name: string;
  category: string;
  description: string;
  discovery: string;
}

export interface Machine {
  id: MachineId;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  concept: string;
  color: string;
  parts: Part[];
}

const load: Part = { id: 'load', name: 'The load', category: 'The thing we move', description: 'This is the weight the machine helps you lift. A heavier load needs a bigger force.', discovery: 'Double the load and the effort doubles too. The machine’s mechanical advantage stays the same.' };
const bolt: Part = { id: 'bolt', name: 'Mounting bolts', category: 'Keeping it together', description: 'Bolts hold the machine’s support firmly in place. They stop the frame from shifting while the machine works.', discovery: 'A bolt is a fastener. We can inspect it here; changing it does not change this model’s mechanical advantage.' };

export const machines: Machine[] = [
  {
    id: 'lever', number: '01', title: 'The lever', subtitle: 'A little push. A big lift.',
    description: 'Move the pivot and discover how a simple beam can give your strength a helping hand.',
    concept: 'Force & balance', color: '#cf7761',
    parts: [
      { id: 'beam', name: 'The beam', category: 'A rigid bar', description: 'The beam turns around the fulcrum. You push on one end and lift a load on the other.', discovery: 'The longer your side of the beam, the less force you need. But your end has to travel farther.' },
      { id: 'fulcrum', name: 'The fulcrum', category: 'The turning point', description: 'This support is the pivot: the point the beam turns around. Moving it changes the length of each arm.', discovery: 'Move the fulcrum closer to the load. Your effort arm gets longer, and lifting gets easier.' },
      load,
      { id: 'effort', name: 'The effort pad', category: 'Where you push', description: 'This pad shows where your input force acts. Pushing down here lifts the load at the other end.', discovery: 'At the same input speed, a longer effort arm lifts the load more slowly. Less force comes with more travel.' },
      bolt,
    ],
  },
  {
    id: 'pulley', number: '02', title: 'The pulley', subtitle: 'Pull down. Lift up.',
    description: 'Follow the rope and find out how an extra wheel can make a heavy load feel lighter.',
    concept: 'Force & movement', color: '#dea84a',
    parts: [
      { id: 'frame', name: 'The frame', category: 'A steady support', description: 'The frame holds the fixed wheel and rope anchor in place. It carries the forces down to the ground.', discovery: 'Only a wheel that moves with the load adds a supporting rope section. The frame and fixed wheel stay put.' },
      { id: 'wheel', name: 'The fixed wheel', category: 'Changing direction', description: 'This wheel stays attached to the frame. It lets you pull down on the rope to lift a load up.', discovery: 'A fixed pulley changes the direction of your pull, but by itself it does not reduce the effort.' },
      { id: 'movable-wheel', name: 'The moving wheel', category: 'Sharing the load', description: 'This wheel travels with the load. Two rope sections hold it up, so each shares the weight.', discovery: 'Two supporting rope sections halve the ideal effort. You must pull twice as much rope to lift the same distance.' },
      { id: 'rope', name: 'The rope', category: 'Carrying the tension', description: 'The rope transfers your pull around the wheels. In our ideal model, its tension is equal along the rope.', discovery: 'Count only the rope sections supporting the moving load. Those sections determine mechanical advantage.' },
      { id: 'effort', name: 'The pull handle', category: 'Where you pull', description: 'This handle is where you apply the effort. Pulling it down draws rope over the fixed wheel and lifts the load.', discovery: 'With two supporting sections, pull the handle twice as far as you want to lift the load.' },
      { id: 'axle', name: 'The axle', category: 'A place to turn', description: 'The wheel spins around this shaft. A bearing helps it turn smoothly while the frame keeps it in place.', discovery: 'Friction at the bearing wastes some input energy as heat. Turn on friction to see the extra effort.' },
      load,
      { id: 'hook', name: 'The hook', category: 'Connecting the load', description: 'The hook connects the load to the rope or moving wheel, so the lifting force reaches the load.', discovery: 'The hook moves with the load. Its travel helps you compare load speed with rope speed.' },
      bolt,
    ],
  },
];

export const defaults: Record<MachineId, Settings> = {
  lever: { mass: 10, loadInput: 'mass', gravity: 9.8, loadArm: 1.008, effortArm: 2.592, liftDistance: 0.2, efficiency: 0.8, speed: 0.2, segments: 1, friction: false, radius: 0.32 },
  pulley: { mass: 10, loadInput: 'mass', gravity: 9.8, loadArm: 1.008, effortArm: 2.592, liftDistance: 0.65, efficiency: 0.8, speed: 0.2, segments: 1, friction: false, radius: 0.32 },
};

export function availableParts(machine: Machine, settings: Settings) {
  return machine.parts.filter(part => part.id !== 'movable-wheel' || settings.segments === 2);
}
