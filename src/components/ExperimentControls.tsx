import { SlidersHorizontal, Info } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import type { MachineId } from '../machines';
import { useLab } from '../store';
import { calculate, maxLift } from '../physics';

function Slider({ id, label, value, min, max, step = 1, unit, display, description, onChange }: { id: string; label: string; value: number; min: number; max: number; step?: number; unit: string; display?: string; description?: string; onChange: (value: number) => void }) {
  return <div className="slider-control">
    <div className="control-label"><label htmlFor={id}>{label}</label><output htmlFor={id}>{display ?? value}<span>{unit}</span></output></div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as CSSProperties} />
    <div className="range-limits"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    {description && <p className="control-description">{description}</p>}
  </div>;
}

function ExactInput({ id, label, value, unit, min, max, onCommit }: { id: string; label: string; value: number; unit: string; min: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(Number(value.toFixed(6))));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(String(Number(value.toFixed(6)))); setInvalid(false); }, [value]);
  function commit() {
    const number = Number(draft);
    if (!draft.trim() || !Number.isFinite(number) || number < min || number > max) { setInvalid(true); return; }
    setInvalid(false);
    onCommit(number);
  }
  return <div className="exact-control"><label htmlFor={id}>{label}</label><div><input id={id} type="number" step="any" min={min} max={max} value={draft} aria-invalid={invalid} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} /><span>{unit}</span></div>{invalid && <span className="field-error" role="alert">Enter a value from {min} to {Number(max.toFixed(3))} {unit}.</span>}</div>;
}

export default function ExperimentControls({ machine, embedded = false }: { machine: MachineId; embedded?: boolean }) {
  const settings = useLab(s => s.settings[machine]);
  const update = useLab(s => s.update);
  const result = calculate(machine, settings);
  const error = useLab(s => s.error);
  const pivotMin = Math.max(15, Math.ceil(Math.max(0.2, settings.liftDistance / Math.sin(0.35)) / result.beamLength * 100));
  const pivotMax = Math.min(75, Math.floor((result.beamLength - 0.2) / result.beamLength * 100));
  return <section className="experiment-controls" aria-labelledby={embedded ? 'canvas-controls-toggle' : 'controls-heading'}>
    {!embedded && <div className="panel-heading"><SlidersHorizontal size={17} /><h2 id="controls-heading">Make it your experiment</h2></div>}
    <div className="load-type-control"><span className="standalone-label">Describe the load</span><div className="segmented-control"><button aria-pressed={settings.loadInput === 'mass'} onClick={() => update(machine, { loadInput: 'mass' })}>Mass · kg</button><button aria-pressed={settings.loadInput === 'weight'} onClick={() => update(machine, { loadInput: 'weight' })}>Weight · N</button></div></div>
    {settings.loadInput === 'mass' ? <Slider id="mass" label="Load mass" value={settings.mass} min={Math.min(1, settings.mass)} max={Math.max(30, settings.mass)} step={0.1} unit=" kg" display={String(Number(settings.mass.toFixed(2)))} description={`Mass is matter; weight is gravity’s force: ${result.weight.toFixed(2)} N.`} onChange={mass => update(machine, { mass })} /> : <ExactInput id="weight" label="Load weight" value={result.weight} unit="N" min={settings.gravity * 0.01} max={settings.gravity * 1000} onCommit={weight => update(machine, { mass: weight / settings.gravity })} />}
    {machine === 'lever' ? <Slider id="pivot" label="Fulcrum position" value={result.pivot} min={Math.min(pivotMin, result.pivot)} max={Math.max(pivotMax, result.pivot)} unit="%" display={String(Number(result.pivot.toFixed(1)))} description="Measured from the load end. The range respects this lift’s geometry; exact arm lengths are below." onChange={pivot => update(machine, { loadArm: result.beamLength * pivot / 100, effortArm: result.beamLength * (1 - pivot / 100) })} /> : <div className="arrangement-control">
      <label className="standalone-label">Pulley arrangement</label>
      <div className="segmented-control"><button aria-pressed={settings.segments === 1} onClick={() => update(machine, { segments: 1 })}>One fixed wheel<span>1 supporting section</span></button><button aria-pressed={settings.segments === 2} onClick={() => update(machine, { segments: 2 })}>Add a moving wheel<span>2 supporting sections</span></button></div>
      <p className="control-description">A moving wheel shares the load between two rope sections.</p>
    </div>}
    <Slider id="speed" label={machine === 'lever' ? 'Push speed' : 'Rope pull speed'} value={settings.speed} min={Math.min(0.05, settings.speed)} max={Math.max(0.4, settings.speed)} step={0.05} unit=" m/s" display={settings.speed.toFixed(2)} onChange={speed => update(machine, { speed })} />
    {machine === 'pulley' && <Slider id="radius" label="Wheel radius" value={settings.radius} min={Math.min(0.24, settings.radius)} max={Math.max(0.4, settings.radius)} step={0.02} unit=" m" display={settings.radius.toFixed(2)} description="Changes how fast the wheels spin, not their lifting advantage." onChange={radius => update(machine, { radius })} />}
    <div className="friction-control"><div><label htmlFor="friction">Add a little friction</label><span>{settings.friction ? `${Number((settings.efficiency * 100).toFixed(1))}% efficient · some energy becomes heat` : 'Ideal mode · no energy lost'}</span></div><button id="friction" role="switch" aria-checked={settings.friction} aria-label="Add a little friction" className="toggle-switch" onClick={() => update(machine, { friction: !settings.friction, efficiency: !settings.friction && settings.efficiency === 1 ? 0.8 : settings.efficiency })}><span /></button></div>
    <details className="problem-parameters"><summary>Exact problem parameters</summary><div className="exact-fields">
      {settings.loadInput === 'mass' && <ExactInput id="mass-exact" label="Exact mass" value={settings.mass} unit="kg" min={0.01} max={1000} onCommit={mass => update(machine, { mass })} />}
      <ExactInput id="gravity" label="Gravity (g)" value={settings.gravity} unit="m/s²" min={0.1} max={30} onCommit={gravity => update(machine, { gravity })} />
      {machine === 'pulley' && <ExactInput id="radius-exact" label="Exact wheel radius" value={settings.radius} unit="m" min={0.1} max={0.5} onCommit={radius => update(machine, { radius })} />}
      {machine === 'lever' && <><ExactInput id="load-arm" label="Load arm length" value={settings.loadArm} unit="m" min={0.2} max={3} onCommit={loadArm => update(machine, { loadArm })} /><ExactInput id="effort-arm" label="Effort arm length" value={settings.effortArm} unit="m" min={0.2} max={3} onCommit={effortArm => update(machine, { effortArm })} /><p className="control-description">Beam length = {result.beamLength.toFixed(3)} m. Arm lengths change the actual geometry.</p></>}
      <ExactInput id="lift-distance" label="Lift distance" value={settings.liftDistance} unit="m" min={0.01} max={2} onCommit={liftDistance => update(machine, { liftDistance })} />
      {machine === 'lever' && <p className="control-description">This load arm supports up to {maxLift(machine, settings).toFixed(3)} m of lift in a 20° stroke.</p>}
      <ExactInput id="efficiency" label="Efficiency" value={settings.efficiency * 100} unit="%" min={10} max={100} onCommit={efficiency => update(machine, { efficiency: efficiency / 100, friction: efficiency < 100 })} />
      <ExactInput id="speed-exact" label="Exact input speed" value={settings.speed} unit="m/s" min={0.01} max={2} onCommit={speed => update(machine, { speed })} />
    </div></details>
    {error && <p className="configuration-error" role="alert">{error}</p>}
    <div className="controls-insight"><Info size={16} /><p>{result.advantage > 1 ? <>Less force, more travel. With <strong>{result.advantage.toFixed(1)}×</strong> advantage, the load moves {result.advantage.toFixed(1)}× slower than your input.</> : result.advantage < 1 ? <>A faster lift needs a stronger push. Your load moves <strong>{(1 / result.advantage).toFixed(1)}×</strong> faster than your input.</> : <>Same force, same speed.{machine === 'pulley' ? ' The fixed wheel changes the direction of your pull.' : ' Equal arms balance the forces.'}</>}</p></div>
  </section>;
}
