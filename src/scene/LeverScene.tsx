import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useLab } from '../store';
import { calculate, leverMotion } from '../physics';
import { Bolt, SelectablePart, Solid } from './SelectablePart';
import SceneLabel from './SceneLabel';

export default function LeverScene() {
  const settings = useLab(s => s.settings.lever);
  const hidden = useLab(s => s.problem && !s.problemRevealed ? s.problem.result.interpretation.unknown : null);
  const beam = useRef<Group>(null);
  const time = useRef(0);
  const lastReset = useRef(-1);
  const result = calculate('lever', settings);
  const pivotX = -result.beamLength / 2 + result.loadArm;
  const pivotY = Math.max(1.13, result.inputDistance + 0.45);
  const supportHeight = pivotY - 0.22;

  useFrame((_, delta) => {
    const state = useLab.getState();
    if (lastReset.current !== state.resetKey) { time.current = 0; lastReset.current = state.resetKey; }
    if (state.running) time.current = (time.current + Math.min(delta, 0.05) / result.liftTime) % 2;
    const fraction = time.current <= 1 ? time.current : 2 - time.current;
    if (beam.current) beam.current.rotation.z = leverMotion(settings, fraction).angle;
  });

  return <group position={[0, 0.05, 0]}>
    <SelectablePart id="fulcrum" position={[pivotX, 0, 0]}>
      <Solid color="#203d3b" position={[0, 0.08, 0]}><boxGeometry args={[0.75, 0.16, 0.68]} /></Solid>
      <Solid color="#42756c" position={[0, 0.16 + supportHeight / 2, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.47, supportHeight, 4]} /></Solid>
      <Solid color="#e8b550" position={[0, pivotY - 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 0.58, 24]} /></Solid>
    </SelectablePart>
    <Bolt position={[pivotX, pivotY - 0.1, 0.32]} />
    <Bolt position={[pivotX - 0.25, 0.12, 0.35]} />
    <Bolt position={[pivotX + 0.25, 0.12, 0.35]} />
    <group ref={beam} position={[pivotX, pivotY, 0]}>
      <SelectablePart id="beam">
        <Solid color="#ce7d63" position={[-pivotX, 0, 0]}><boxGeometry args={[result.beamLength + 0.3, 0.16, 0.4]} /></Solid>
        <Solid color="#a25743" position={[-pivotX, -0.075, 0]}><boxGeometry args={[result.beamLength + 0.3, 0.025, 0.42]} /></Solid>
        {Array.from({ length: Math.floor(result.beamLength / 0.2) + 1 }, (_, index) => <Solid key={index} color="#965b47" position={[-result.beamLength / 2 + index * 0.2 - pivotX, 0.084, 0.12]}><boxGeometry args={[0.014, 0.006, index % 2 ? 0.055 : 0.09]} /></Solid>)}
      </SelectablePart>
      <SelectablePart id="load" position={[-result.loadArm, 0.08, 0]}>
        <Solid color="#e8b14c" position={[0, 0.26, 0]}><boxGeometry args={[0.46, 0.52, 0.44]} /></Solid>
        <Solid color="#f2c775" position={[0, 0.53, 0]}><boxGeometry args={[0.46, 0.025, 0.44]} /></Solid>
        <Solid color="#203d3b" position={[0, 0.61, 0]}><torusGeometry args={[0.12, 0.025, 8, 24, Math.PI]} /></Solid>
        <SceneLabel position={[0, 0.25, 0.235]} lines={[`${Number(settings.mass.toFixed(2))} kg`]} width={0.42} color="#503d24" />
      </SelectablePart>
      <SelectablePart id="effort" position={[result.effortArm, 0.13, 0]}>
        <Solid color="#203d3b"><boxGeometry args={[0.37, 0.1, 0.44]} /></Solid>
        <group position={[0, 0.6, 0]}>
          <Solid color="#35655b"><cylinderGeometry args={[0.024, 0.024, 0.35, 12]} /></Solid>
          <Solid color="#35655b" position={[0, -0.24, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.09, 0.16, 16]} /></Solid>
        </group>
      </SelectablePart>
      <SceneLabel position={[-result.loadArm / 2, -0.18, 0.28]} lines={['LOAD ARM', `${result.loadArm.toFixed(2)} m`]} width={Math.min(0.55, result.loadArm * 0.9)} />
      <SceneLabel position={[result.effortArm / 2, -0.18, 0.28]} lines={['EFFORT ARM', `${result.effortArm.toFixed(2)} m`]} width={Math.min(0.65, result.effortArm * 0.9)} />
    </group>
    <SceneLabel position={[pivotX, 0.32, 0.45]} lines={['FULCRUM']} width={0.46} color="#e9e7cf" />
    <SceneLabel position={[-result.beamLength / 2, pivotY + settings.liftDistance + 0.9, 0]} lines={['LOAD', hidden === 'weight' ? '? N' : `${result.weight.toFixed(1)} N`]} />
    <SceneLabel position={[result.beamLength / 2, pivotY + 1, 0]} lines={['EFFORT', hidden === 'effort' ? '? N' : `${result.effort.toFixed(1)} N`]} />
  </group>;
}
