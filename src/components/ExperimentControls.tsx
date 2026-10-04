import { SlidersHorizontal, Info } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { MachineId } from '../machines';
import { useLab } from '../store';
import { calculate } from '../physics';

function Slider({ id, label, value, min, max, step = 1, unit, display, description, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; unit: string; display?: string; description?: string; onChange: (value: number) => void }) {
  return <div className="slider-control">
    <div className="control-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display ?? value}<span>{unit}</span></output></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as CSSProperties} />
    <div className="range-limits"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    {description && <p className="control-description">{description}</p>}
  </div>;
}

export default function ExperimentControls({ machine, embedded = false }: { machine: MachineId; embedded?: boolean }) {
  const settings = useLab(s => s.settings[machine]);
  const update = useLab(s => s.update);
  const result = calculate(machine, settings);
  return <section className="experiment-controls" aria-labelledby={embedded ? 'canvas-controls-toggle' : 'controls-heading'}>
    {!embedded && <div className="panel-heading"><SlidersHorizontal size={17} /><h2 id="controls-heading">Make it your experiment</h2></div>}
    <Slider id="mass" label="Load weight" value={settings.mass} min={1} max={30} unit=" kg" description="How heavy is the thing we’re lifting?" onChange={mass => update(machine, { mass })} />
    {machine === 'lever' ? <Slider id="pivot" label="Fulcrum position" value={settings.pivot} min={15} max={75} unit="%" description="Measured from the load end. Try moving it closer to the load." onChange={pivot => update(machine, { pivot })} /> : <div className="arrangement-control">
      <label className="standalone-label">Pulley arrangement</label>
      <div className="segmented-control"><button aria-pressed={settings.segments === 1} onClick={() => update(machine, { segments: 1 })}>One fixed wheel<span>1 supporting section</span></button><button aria-pressed={settings.segments === 2} onClick={() => update(machine, { segments: 2 })}>Add a moving wheel<span>2 supporting sections</span></button></div>
      <p className="control-description">A moving wheel shares the load between two rope sections.</p>
    </div>}
    <Slider id="speed" label={machine === 'lever' ? 'Push speed' : 'Rope pull speed'} value={settings.speed} min={0.05} max={0.4} step={0.05} unit=" m/s" display={settings.speed.toFixed(2)} onChange={speed => update(machine, { speed })} />
    {machine === 'pulley' && <Slider id="radius" label="Wheel radius" value={settings.radius} min={0.24} max={0.4} step={0.02} unit=" m" display={settings.radius.toFixed(2)} description="Changes how fast the wheels spin, not their lifting advantage." onChange={radius => update(machine, { radius })} />}
    <div className="friction-control"><div><label htmlFor="friction">Add a little friction</label><span>{settings.friction ? '80% efficient · some energy becomes heat' : 'Ideal mode · no energy lost'}</span></div><button id="friction" role="switch" aria-checked={settings.friction} aria-label="Add a little friction" className="toggle-switch" onClick={() => update(machine, { friction: !settings.friction })}><span /></button></div>
    <div className="controls-insight"><Info size={16} /><p>{result.advantage > 1 ? <>Less force, more travel. With <strong>{result.advantage.toFixed(1)}×</strong> advantage, the load moves {result.advantage.toFixed(1)}× slower than your input.</> : result.advantage < 1 ? <>A faster lift needs a stronger push. Your load moves <strong>{(1 / result.advantage).toFixed(1)}×</strong> faster than your input.</> : <>Same force, same speed.{machine === 'pulley' ? ' The fixed wheel changes the direction of your pull.' : ' Equal arms balance the forces.'}</>}</p></div>
  </section>;
}
