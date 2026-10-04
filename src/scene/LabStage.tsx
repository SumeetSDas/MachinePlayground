import { Component, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useLab } from '../store';
import type { MachineId } from '../machines';
import LeverScene from './LeverScene';
import PulleyScene from './PulleyScene';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="scene-error"><h3>The 3D workshop needs WebGL.</h3><p>Try a browser with hardware acceleration enabled. You can still explore the controls and part explanations.</p></div> : this.props.children;
  }
}

export default function LabStage({ machine }: { machine: MachineId }) {
  const resetKey = useLab(s => s.resetKey);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return <SceneBoundary><Canvas shadows dpr={[1, 1.75]} camera={{ position: machine === 'lever' ? [3.4, 2.9, 6.8] : [3.7, 3.0, 6.5], fov: 39 }} onPointerMissed={() => useLab.getState().select(null)} gl={{ antialias: true }} aria-label={`Interactive 3D ${machine}. Drag to rotate, scroll to zoom, or select a part using the list below.`}>
    <color attach="background" args={['#eeeee5']} />
    <ambientLight intensity={1.6} />
    <directionalLight position={[3, 7, 5]} intensity={3} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={6} shadow-camera-bottom={-4} shadow-normalBias={0.025} />
    <directionalLight position={[-4, 3, -2]} intensity={1.3} color="#e5ede3" />
    <Suspense fallback={null}>{machine === 'lever' ? <LeverScene /> : <PulleyScene />}</Suspense>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}><planeGeometry args={[200, 200]} /><meshBasicMaterial color="#eeeee5" toneMapped={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow><planeGeometry args={[200, 200]} /><shadowMaterial opacity={0.12} /></mesh>
    <Grid position={[0, -0.009, 0]} args={[20, 20]} cellSize={0.4} cellThickness={0.55} cellColor="#c9cec0" sectionSize={2} sectionThickness={0.6} sectionColor="#bfc7b8" fadeDistance={12} fadeStrength={2} infiniteGrid />
    <OrbitControls key={resetKey} makeDefault target={machine === 'lever' ? [0, 1.1, 0] : [0, 1.85, 0]} minDistance={4} maxDistance={11} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2.1} enablePan={false} />
  </Canvas></SceneBoundary>;
}
