import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type { MachineId } from '../machines';
import ExperimentControls from './ExperimentControls';

export default function CanvasControls({ machine, expanded, onToggle }: { machine: MachineId; expanded: boolean; onToggle: () => void }) {
  return <div className={`canvas-controls ${expanded ? 'is-expanded' : ''}`}>
    <button id="canvas-controls-toggle" className="canvas-controls-toggle" aria-expanded={expanded} aria-controls="canvas-controls-body" onClick={onToggle}>
      <SlidersHorizontal size={16} />
      <span>{expanded ? 'Make it your experiment' : 'Controls'}</span>
      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
    <div id="canvas-controls-body" className="canvas-controls-body" hidden={!expanded}>
      <ExperimentControls machine={machine} embedded />
    </div>
  </div>;
}
