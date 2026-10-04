import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { useLab } from '../store';

export function Brand({ small = false }: { small?: boolean }) {
  return <button className={`brand ${small ? 'brand-small' : ''}`} onClick={() => useLab.getState().open(null)} aria-label="Machine Playground home">
    <span className="brand-symbol" aria-hidden="true"><i /><i /><i /><i /></span>
    <span>machine<span className="brand-second">playground<span className="brand-period">.</span></span></span>
  </button>;
}

export function SiteHeader({ lab = false }: { lab?: boolean }) {
  return <header className={`site-header ${lab ? 'lab-header' : ''}`}>
    <Brand small={lab} />
    {lab ? <button className="text-button back-button" onClick={() => useLab.getState().open(null)}><ArrowLeft size={16} /> All machines</button> : <>
      <span className="header-note">Made for curious minds.</span>
      <a className="text-button" href="#machines">Enter the workshop <ArrowUpRight size={17} /></a>
    </>}
  </header>;
}
