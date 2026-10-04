import { lazy, Suspense } from 'react';
import { useLab } from './store';
import Library from './Library';

const MachineLab = lazy(() => import('./MachineLab'));

export default function App() {
  const machine = useLab(s => s.machine);
  return machine ? <Suspense fallback={<div className="app-loading"><span className="loading-wheel" />Opening your workshop…</div>}><MachineLab key={machine} machineId={machine} /></Suspense> : <Library />;
}
