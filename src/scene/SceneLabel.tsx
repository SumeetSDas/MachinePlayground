import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/** Canvas-generated labels stay inside the scene: no fonts, assets, or DOM portals. */
export default function SceneLabel({ lines, position, width = 0.8, color = '#3b5a50' }: { lines: string[]; position: [number, number, number]; width?: number; color?: string }) {
  const content = lines.join('\n');
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = lines.length === 1 ? 112 : 220;
    const context = canvas.getContext('2d')!;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    content.split('\n').forEach((line, index) => {
      context.font = lines.length === 1 ? '600 96px sans-serif' : index === 0 ? '500 40px sans-serif' : '600 48px sans-serif';
      context.fillText(line, 256, lines.length === 1 ? 56 : 66 + index * 89);
    });
    const label = new CanvasTexture(canvas);
    label.colorSpace = SRGBColorSpace;
    return label;
  }, [content, color, lines.length]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={position} scale={[width, width * (lines.length === 1 ? 112 : 220) / 512, 1]} raycast={() => {}}><spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} /></sprite>;
}
