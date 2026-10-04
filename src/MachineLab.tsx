import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Move, Maximize2, ArrowRight } from 'lucide-react';
import { machines } from './machines';
import type { MachineId } from './machines';
import { useLab } from './store';
import { SiteHeader } from './components/Brand';
import CanvasControls from './components/CanvasControls';
import PartSidecar from './components/PartSidecar';
import Measurements from './components/Measurements';
import ChallengePanel from './components/ChallengePanel';
import LabStage from './scene/LabStage';
import ProblemPanel from './components/ProblemPanel';

export default function MachineLab({ machineId }: { machineId: MachineId }) {
  const machine = machines.find(m => m.id === machineId)!;
  const running = useLab(s => s.running);
  const toggle = useLab(s => s.toggle);
  const reset = useLab(s => s.reset);
  const friction = useLab(s => s.settings[machineId].friction);
  const [controlsOpen, setControlsOpen] = useState(() => !window.matchMedia('(max-width: 820px)').matches);
  const stageRef = useRef<HTMLDivElement>(null);
  const focusFrame = useRef<number | null>(null);

  function focusControl(controlId: string) {
    setControlsOpen(true);
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const control = document.getElementById(controlId);
      const body = document.getElementById('canvas-controls-body');
      if (control && body) {
        const controlBounds = control.getBoundingClientRect();
        const bodyBounds = body.getBoundingClientRect();
        if (controlBounds.bottom > bodyBounds.bottom - 12) body.scrollTop += controlBounds.bottom - bodyBounds.bottom + 12;
        else if (controlBounds.top < bodyBounds.top + 12) body.scrollTop -= bodyBounds.top - controlBounds.top + 12;
      }
      control?.focus({ preventScroll: true });
      stageRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      focusFrame.current = null;
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${machine.title} — Machine Playground`;
    const keydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'A'].includes(target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); useLab.getState().toggle(); }
      if (event.key === 'Escape') useLab.getState().select(null);
    };
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      document.title = 'Machine Playground — A little workshop for big discoveries';
    };
  }, [machine.title]);
  return <div className="lab-page">
    <SiteHeader lab />
    <main className="lab-main">
      <div className="lab-title-row"><div><div className="eyebrow muted">EXPERIMENT {machine.number} <span className="eyebrow-divider">/</span> {machine.concept.toUpperCase()}</div><h1>{machine.title}<span className="serif-italic">{machine.subtitle}</span></h1></div><button className="text-button switch-machine" onClick={() => useLab.getState().open(machineId === 'lever' ? 'pulley' : 'lever')}>Try the {machineId === 'lever' ? 'pulley' : 'lever'} <ArrowRight size={16} /></button></div>
      <ProblemPanel />
      <div ref={stageRef} className={`scene-stage scene-with-controls ${controlsOpen ? 'controls-open' : ''}`}>
        <div className="stage-viewport"><LabStage machine={machineId} /></div>
        <div className="stage-top"><span className={`operation-status ${running ? '' : 'paused'}`}><span className="status-dot" /> {running ? 'IN MOTION' : 'PAUSED'}</span><span className="stage-mode">{friction ? 'WITH FRICTION' : 'IDEAL MACHINE'}</span></div>
        <ProblemOverlay />
        <CanvasControls machine={machineId} expanded={controlsOpen} onToggle={() => setControlsOpen(open => !open)} />
        <div className="stage-bottom"><span className="stage-instruction"><Move size={14} /> Drag to look around <i /> Tap a part to explore</span><div className="playback-controls"><button className="icon-button" aria-label={running ? 'Pause simulation' : 'Play simulation'} title={running ? 'Pause (space)' : 'Play (space)'} onClick={toggle}>{running ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" aria-label="Reset experiment and camera" title="Reset experiment and camera" onClick={reset}><RotateCcw size={17} /></button><button className="icon-button fullscreen-button" aria-label="Expand 3D view" title="Expand 3D view" onClick={() => {
            const stage = stageRef.current;
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
            else if (stage?.requestFullscreen) void stage.requestFullscreen().catch(() => {});
          }}><Maximize2 size={17} /></button></div></div>
      </div>
      <Measurements machine={machineId} />
      <div className="lab-discoveries">
        <div>
          <ChallengePanel machine={machineId} />
          <p className="model-note">A simplified model: rigid parts, vertical effort and load forces, massless rope, and constant vertical lifting speed. The animation lifts through the chosen distance, then returns; measurements describe the lift. Gravity and efficiency are configurable. This model does not simulate acceleration from an applied force.</p>
        </div>
        <aside><PartSidecar machine={machine} onChangePart={focusControl} /></aside>
      </div>
    </main>
    <footer className="lab-footer"><span>Keep asking “what if?”</span><span>Every great idea starts with a little experiment. <span className="footer-mark">✳</span></span></footer>
  </div>;
}

function ProblemOverlay() {
  const problem = useLab(s => s.problem);
  const revealed = useLab(s => s.problemRevealed);
  if (!problem) return null;
  return <div className="problem-overlay"><span>PROBLEM SETUP · {problem.result.configuration.machine.toUpperCase()}</span><strong>{problem.result.answer.label}: {revealed ? `${Number(problem.result.answer.value.toPrecision(6))} ${problem.result.answer.unit}` : '?'}</strong><button onClick={() => useLab.getState().select(problem.result.highlight)}>Highlight the {problem.result.highlight === 'effort' ? 'effort pad' : problem.result.highlight}</button></div>;
}
