import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThreeElements } from '@react-three/fiber';
import { useLab } from '../store';
import type { PartId } from '../machines';

const Highlight = createContext(false);

export function SelectablePart({ id, children, ...props }: { id: PartId; children: ReactNode } & Omit<ThreeElements['group'], 'id' | 'children'>) {
  const selected = useLab(s => s.selected === id);
  const problemTarget = useLab(s => s.problem?.result.highlight === id);
  const [hover, setHover] = useState(false);
  return <group {...props} onClick={event => { event.stopPropagation(); useLab.getState().select(id); }} onPointerOver={event => { event.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}>
    <Highlight.Provider value={selected || hover || problemTarget}>{children}</Highlight.Provider>
  </group>;
}

export function Solid({ color, children, ...props }: { color: string; children: ReactNode } & ThreeElements['mesh']) {
  const highlighted = useContext(Highlight);
  return <mesh castShadow receiveShadow {...props}>{children}<meshStandardMaterial color={highlighted ? '#f6ce6c' : color} roughness={0.55} metalness={0.08} emissive={highlighted ? '#eab555' : '#000000'} emissiveIntensity={highlighted ? 0.25 : 0} /></mesh>;
}

export function Bolt({ position }: { position: [number, number, number] }) {
  return <SelectablePart id="bolt" position={position}><Solid color="#cad1c7" rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.075, 0.075, 0.05, 6]} /></Solid><Solid color="#64786f" position={[0, 0, 0.035]}><boxGeometry args={[0.075, 0.016, 0.007]} /></Solid></SelectablePart>;
}
