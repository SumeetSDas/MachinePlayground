import { useEffect } from 'react';
import { Pause, Play, RotateCcw, Move, Maximize2, ArrowRight } from 'lucide-react';
import { machines } from './machines';
import type { MachineId } from './machines';
import { useLab } from './store';
import { SiteHeader } from './components/Brand';
import ExperimentControls from './components/ExperimentControls';
import PartSidecar from './components/PartSidecar';
import Measurements from './components/Measurements';
import ChallengePanel from './components/ChallengePanel';
import LabStage from './scene/LabStage';

export default function MachineLab({ machineId }: { machineId: MachineId }) {
  const machine = machines.find(m => m.id === machineId)!;
  const running = useLab(s => s.running);
  const toggle = useLab(s => s.toggle);
  const reset = useLab(s => s.reset);
  const friction = useLab(s => s.settings[machineId].friction);
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
    return () => { window.removeEventListener('keydown', keydown); document.title = 'Machine Playground — A little workshop for big discoveries'; };
  }, [machine.title]);
  return <div className="lab-page">
    <SiteHeader lab />
    <main className="lab-main">
      <div className="lab-title-row"><div><div className="eyebrow muted">EXPERIMENT {machine.number} <span className="eyebrow-divider">/</span> {machine.concept.toUpperCase()}</div><h1>{machine.title}<span className="serif-italic">{machine.subtitle}</span></h1></div><button className="text-button switch-machine" onClick={() => useLab.getState().open(machineId === 'lever' ? 'pulley' : 'lever')}>Try the {machineId === 'lever' ? 'pulley' : 'lever'} <ArrowRight size={16} /></button></div>
      <div className="lab-layout">
        <div className="lab-experiment">
          <div className="scene-stage"><LabStage machine={machineId} /><div className="stage-top"><span className={`operation-status ${running ? '' : 'paused'}`}><span className="status-dot" /> {running ? 'IN MOTION' : 'PAUSED'}</span><span className="stage-mode">{friction ? 'WITH FRICTION' : 'IDEAL MACHINE'}</span></div><div className="stage-bottom"><span className="stage-instruction"><Move size={14} /> Drag to look around <i /> Tap a part to explore</span><div className="playback-controls"><button className="icon-button" aria-label={running ? 'Pause simulation' : 'Play simulation'} title={running ? 'Pause (space)' : 'Play (space)'} onClick={toggle}>{running ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" aria-label="Reset experiment and camera" title="Reset experiment and camera" onClick={reset}><RotateCcw size={17} /></button><button className="icon-button fullscreen-button" aria-label="Expand 3D view" title="Expand 3D view" onClick={() => {
            const stage = document.querySelector('.scene-stage');
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
            else if (stage?.requestFullscreen) void stage.requestFullscreen().catch(() => {});
          }}><Maximize2 size={17} /></button></div></div></div>
          <Measurements machine={machineId} />
          <ChallengePanel machine={machineId} />
          <p className="model-note">A simplified model for exploring: rigid parts, constant lifting speed, and massless rope. The animation lifts, then returns to repeat; measurements describe the lifting stroke. Friction uses a fixed 80% efficiency.</p>
        </div>
        <aside className="lab-sidebar"><ExperimentControls machine={machineId} /><PartSidecar machine={machine} /></aside>
      </div>
    </main>
    <footer className="lab-footer"><span>Keep asking “what if?”</span><span>Every great idea starts with a little experiment. <span className="footer-mark">✳</span></span></footer>
  </div>;
}
