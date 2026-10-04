import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import { useLab } from '../store';
import { calculate, pulleyGeometry, pulleyMotion } from '../physics';
import { Bolt, SelectablePart, Solid } from './SelectablePart';
import type { PartId } from '../machines';
import SceneLabel from './SceneLabel';

function RopeArc({ radius, lower = false }: { radius: number; lower?: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(Array.from({ length: 33 }, (_, index) => {
    const angle = lower ? Math.PI + index / 32 * Math.PI : Math.PI - index / 32 * Math.PI;
    return new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.04);
  })), [radius, lower]);
  return <Solid color="#ad966d"><tubeGeometry args={[curve, 40, 0.025, 8, false]} /></Solid>;
}

function Wheel({ radius, wheelRef, id }: { radius: number; wheelRef: RefObject<Group | null>; id: PartId }) {
  return <>
    <SelectablePart id={id}>
      <group ref={wheelRef}>
        <Solid color="#b48337" rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, 0.18, 40]} /></Solid>
        <Solid color="#e6b04c" position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius * 0.89, radius * 0.89, 0.03, 40]} /></Solid>
        {[0, Math.PI / 3, Math.PI * 2 / 3].map(angle => <Solid key={angle} color="#bd8a36" rotation={[0, 0, angle]} position={[0, 0, 0.125]}><boxGeometry args={[radius * 1.5, 0.045, 0.017]} /></Solid>)}
      </group>
    </SelectablePart>
    <SelectablePart id="axle"><Solid color="#203d3b" position={[0, 0, 0.17]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.08, 0.08, 0.14, 20]} /></Solid></SelectablePart>
  </>;
}

export default function PulleyScene() {
  const settings = useLab(s => s.settings.pulley);
  const fixedWheel = useRef<Group>(null);
  const movingWheel = useRef<Group>(null);
  const loadGroup = useRef<Group>(null);
  const handleGroup = useRef<Group>(null);
  const leftRope = useRef<Mesh>(null);
  const middleRope = useRef<Mesh>(null);
  const rightRope = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const lastReset = useRef(-1);
  const result = calculate('pulley', settings);
  const radius = settings.radius;
  const fixedX = 0.65;
  const geometry = pulleyGeometry(settings);
  const fixedY = geometry.fixedY;
  const loadX = settings.segments === 2 ? fixedX - radius * 2 : fixedX - radius;

  useFrame((_, delta) => {
    const state = useLab.getState();
    if (lastReset.current !== state.resetKey) { elapsed.current = 0; lastReset.current = state.resetKey; }
    if (state.running) elapsed.current = (elapsed.current + Math.min(delta, 0.05) / result.liftTime) % 2;
    const fraction = elapsed.current <= 1 ? elapsed.current : 2 - elapsed.current;
    const { loadY, handleY, fixedAngle, movingAngle } = pulleyMotion(settings, fraction);
    if (loadGroup.current) loadGroup.current.position.set(loadX, loadY, 0);
    if (handleGroup.current) handleGroup.current.position.set(fixedX + radius, handleY, 0.04);
    if (fixedWheel.current) fixedWheel.current.rotation.z = fixedAngle;
    if (movingWheel.current) movingWheel.current.rotation.z = movingAngle;
    const vertical = (mesh: Mesh | null, x: number, bottom: number, top: number) => {
      if (mesh) { mesh.position.set(x, (top + bottom) / 2, 0.04); mesh.scale.y = top - bottom; }
    };
    vertical(leftRope.current, settings.segments === 2 ? loadX - radius : loadX, loadY, settings.segments === 2 ? geometry.frameHeight - 0.07 : fixedY);
    vertical(middleRope.current, fixedX - radius, loadY, fixedY);
    vertical(rightRope.current, fixedX + radius, handleY, fixedY);
  });

  return <group position={[0, 0.06, 0]}>
    <group position={[-1.05, 0, -0.15]}>
      <SelectablePart id="frame">
      <Solid color="#35635b" position={[0, geometry.frameHeight / 2, 0]}><boxGeometry args={[0.18, geometry.frameHeight, 0.2]} /></Solid>
      <Solid color="#35635b" position={[1.02, geometry.frameHeight - 0.07, 0]}><boxGeometry args={[2.25, 0.2, 0.24]} /></Solid>
      <Solid color="#203d3b" position={[0, 0.08, 0]}><boxGeometry args={[0.85, 0.15, 0.7]} /></Solid>
      </SelectablePart>
      <Bolt position={[0, geometry.frameHeight - 0.07, 0.16]} /><Bolt position={[-0.26, 0.08, 0.37]} /><Bolt position={[0.26, 0.08, 0.37]} />
    </group>
    <SelectablePart id="axle"><Solid color="#203d3b" position={[fixedX, (geometry.frameHeight + fixedY) / 2, -0.13]}><boxGeometry args={[0.12, geometry.frameHeight - fixedY, 0.12]} /></Solid></SelectablePart>
    <group position={[fixedX, fixedY, 0]}><Wheel radius={radius} wheelRef={fixedWheel} id="wheel" /><SelectablePart id="rope"><RopeArc radius={radius} /></SelectablePart></group>
    <SelectablePart id="rope">
      <Solid ref={leftRope} color="#ad966d"><cylinderGeometry args={[0.025, 0.025, 1, 8]} /></Solid>
      {settings.segments === 2 && <Solid ref={middleRope} color="#ad966d"><cylinderGeometry args={[0.025, 0.025, 1, 8]} /></Solid>}
      <Solid ref={rightRope} color="#ad966d"><cylinderGeometry args={[0.025, 0.025, 1, 8]} /></Solid>
    </SelectablePart>
    <group ref={loadGroup}>
      {settings.segments === 2 && <><Wheel radius={radius} wheelRef={movingWheel} id="movable-wheel" /><SelectablePart id="rope"><RopeArc radius={radius} lower /></SelectablePart></>}
      <SelectablePart id="hook">
        <Solid color="#203d3b" position={[0, settings.segments === 2 ? -radius - 0.12 : -0.11, 0]}><torusGeometry args={[0.085, 0.022, 8, 24, Math.PI * 1.65]} /></Solid>
        {settings.segments === 2 && <Solid color="#203d3b" position={[0, -radius / 2, 0]}><boxGeometry args={[0.07, radius, 0.07]} /></Solid>}
      </SelectablePart>
      <SelectablePart id="load" position={[0, settings.segments === 2 ? -radius - 0.44 : -0.44, 0]}>
        <Solid color="#ce7d63"><boxGeometry args={[0.55, 0.48, 0.45]} /></Solid>
        <Solid color="#d9947c" position={[0, 0.245, 0]}><boxGeometry args={[0.55, 0.025, 0.45]} /></Solid>
        <SceneLabel position={[0, 0, 0.235]} lines={[`${Number(settings.mass.toFixed(2))} kg`]} width={0.45} color="#503d24" />
      </SelectablePart>
    </group>
    <group ref={handleGroup}><SelectablePart id="effort"><Solid color="#203d3b"><boxGeometry args={[0.24, 0.09, 0.12]} /></Solid><Solid color="#35655b" position={[0.23, -0.11, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.07, 0.13, 12]} /></Solid></SelectablePart></group>
    <SceneLabel position={[-1.55, fixedY - 0.2, 0]} lines={[`${settings.segments} SUPPORTING`, settings.segments === 1 ? 'ROPE SECTION' : 'ROPE SECTIONS']} width={1.15} />
  </group>;
}
