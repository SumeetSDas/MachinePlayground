import { Activity, ArrowDown, ArrowUp, Zap } from 'lucide-react';
import type { MachineId } from '../machines';
import { calculate } from '../physics';
import { useLab } from '../store';

export default function Measurements({ machine }: { machine: MachineId }) {
  const settings = useLab(s => s.settings[machine]);
  const result = calculate(machine, settings);
  const hidden = useLab(s => s.problem && !s.problemRevealed ? s.problem.result.interpretation.unknown : null);
  const display = (key: string, value: string) => hidden === key ? '?' : value;
  return <section className="measurements" aria-label="Live measurements for the lifting stroke">
    <div className="measurements-top"><span><Activity size={14} /> THE SCIENCE, LIVE</span><span>g = {settings.gravity} m/s² · η = {Number((result.efficiency * 100).toFixed(1))}%</span></div>
    <div className="measurement-grid">
      <div><span className="measurement-label"><ArrowDown size={14} /> Effort force</span><strong>{display('effort', result.effort.toFixed(1))}<small>N</small></strong><span className="measurement-note">to lift {display('weight', result.weight.toFixed(1))} N</span></div>
      <div><span className="measurement-label"><ArrowUp size={14} /> Load speed</span><strong>{display('loadSpeed', result.loadSpeed.toFixed(2))}<small>m/s</small></strong><span className="measurement-note">input {settings.speed.toFixed(2)} m/s</span></div>
      <div><span className="measurement-label"><Activity size={14} /> Advantage</span><strong>{display('advantage', result.advantage.toFixed(1))}<small>×</small></strong><span className="measurement-note">ideal force multiplier</span></div>
      <div><span className="measurement-label"><Zap size={14} /> Input power</span><strong>{display('inputPower', result.inputPower.toFixed(1))}<small>W</small></strong><span className="measurement-note">{result.outputPower.toFixed(1)} W useful output</span></div>
    </div>
    <div className="stroke-measurements" aria-label="Lifting distance and work"><span>Lift <strong>{settings.liftDistance.toFixed(2)} m</strong></span><span>Input travel <strong>{display('inputDistance', result.inputDistance.toFixed(2))} m</strong></span><span>Lift time <strong>{display('liftTime', result.liftTime.toFixed(2))} s</strong></span><span>Input work <strong>{result.inputWork.toFixed(2)} J</strong></span><span>Useful work <strong>{display('outputWork', result.outputWork.toFixed(2))} J</strong></span></div>
  </section>;
}
