import { ArrowUpRight, MousePointer2, X, Lightbulb, Eye } from 'lucide-react';
import { availableParts } from '../machines';
import type { Machine, PartId } from '../machines';
import { useLab } from '../store';

const partIcons: Partial<Record<PartId, string>> = { beam: '━', fulcrum: '△', load: '▣', effort: '↓', wheel: '◉', 'movable-wheel': '◉', rope: '⌁', axle: '⊙', bolt: '⬡', hook: '∪', frame: 'Π' };

export default function PartSidecar({ machine, onChangePart }: { machine: Machine; onChangePart: (controlId: string) => void }) {
  const selected = useLab(s => s.selected);
  const settings = useLab(s => s.settings[machine.id]);
  const select = useLab(s => s.select);
  const parts = availableParts(machine, settings);
  const part = parts.find(p => p.id === selected);
  return <section className={`part-inspector ${part ? 'has-selection' : ''}`} aria-label="Part inspector">
    <div className="panel-heading"><MousePointer2 size={17} /><h2>Get to know the parts</h2>{part && <button className="icon-button close-inspector" onClick={() => select(null)} aria-label="Close part details"><X size={16} /></button>}</div>
    {part ? <div className="part-details" aria-live="polite"><span className="part-category"><Eye size={13} /> {part.category}</span><div className="part-title"><span className="part-glyph">{partIcons[part.id]}</span><h3>{part.name}</h3></div><p>{part.description}</p><div className="part-discovery"><Lightbulb size={17} /><div><strong>A little discovery</strong><p>{part.discovery}</p></div></div>{['load', 'fulcrum', 'effort', 'wheel', 'movable-wheel', 'axle'].includes(part.id) && <button className="text-button part-control-link" onClick={() => onChangePart(part.id === 'load' ? (settings.loadInput === 'mass' ? 'mass' : 'weight') : part.id === 'fulcrum' ? 'pivot' : part.id === 'effort' ? 'speed' : part.id === 'axle' ? 'friction' : 'radius')}>Try changing it <ArrowUpRight size={15} /></button>}</div> : <p className="inspector-prompt">Every piece has a job. Tap the machine or pick a part below to see what it does.</p>}
    <div className="part-picker" aria-label="Select a machine part">{parts.map(p => <button key={p.id} aria-pressed={selected === p.id} onClick={() => select(p.id)}><span aria-hidden="true">{partIcons[p.id]}</span>{p.name.replace('The ', '')}</button>)}</div>
  </section>;
}
