import { ArrowRight, MoveUpRight, MousePointer2, SlidersHorizontal, Sparkles, Check, ArrowUpRight } from 'lucide-react';
import { machines } from './machines';
import { challenges } from './physics';
import { useLab } from './store';
import { SiteHeader } from './components/Brand';
import MachineIllustration from './components/MachineIllustration';
import ProblemPanel from './components/ProblemPanel';

export default function Library() {
  const open = useLab(s => s.open);
  const completed = useLab(s => s.completed);
  return <div className="library">
    <SiteHeader />
    <main>
      <section className="intro">
        <div className="intro-copy">
          <div className="eyebrow"><span className="status-dot" /> YOUR CURIOSITY. THE CONTROLS.</div>
          <h1>Big discoveries.<br />Simple <span className="serif-italic">machines.</span><span className="headline-star" aria-hidden="true">✳</span></h1>
          <p>A little workshop for your “what ifs”.<br className="desktop-break" /> Push, pull, and play your way into how things work.</p>
          <a href="#machines" className="primary-button">Let’s make something move <ArrowRight size={19} /></a>
          <span className="intro-footnote">No instructions needed. Just a curious mind.</span>
        </div>
        <div className="intro-visual" aria-hidden="true">
          <div className="sketch-label"><span>the power of a simple idea</span><MoveUpRight size={29} strokeWidth={1} /></div>
          <svg viewBox="0 0 520 330" fill="none">
            <ellipse cx="260" cy="282" rx="192" ry="15" fill="#203d3b" opacity=".06" />
            <path d="M184 197L143 271H235L198 197Z" fill="#35635d" />
            <path d="M198 197L235 271H250L210 197Z" fill="#203d3b" />
            <rect x="136" y="268" width="120" height="13" rx="4" fill="#203d3b" />
            <g transform="rotate(-13 198 183)">
              <rect x="56" y="178" width="394" height="23" rx="6" fill="#a65540" />
              <rect x="56" y="172" width="394" height="18" rx="5" fill="#da8b70" />
              {[84, 122, 160, 198, 236, 274, 312, 350, 388, 426].map(x => <path key={x} d={`M${x} 173V180`} stroke="#a65540" strokeWidth="2" />)}
              <rect x="76" y="126" width="66" height="46" rx="7" fill="#edb348" />
              <rect x="83" y="132" width="52" height="5" rx="2" fill="#f9cf6f" />
              <path d="M89 126V110Q109 92 128 110V126" stroke="#203d3b" strokeWidth="7" />
              <text x="109" y="157" textAnchor="middle" fill="#684c20" fontSize="17" fontFamily="sans-serif" fontWeight="700">10 kg</text>
              <rect x="387" y="156" width="41" height="16" rx="8" fill="#203d3b" />
            </g>
            <circle cx="198" cy="191" r="11" fill="#edb348" stroke="#203d3b" strokeWidth="3" />
            <path d="M420 27V81M407 67L420 83L433 67" stroke="#203d3b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M64 211V252M53 225L64 210L75 225" stroke="#a65540" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M289 208Q283 260 254 278" stroke="#718077" strokeWidth="1.5" strokeDasharray="4 5" />
            <text x="303" y="236" fill="#5d6e64" fontSize="15" fontFamily="Georgia,serif" fontStyle="italic">move the pivot.</text>
            <text x="303" y="258" fill="#5d6e64" fontSize="15" fontFamily="Georgia,serif" fontStyle="italic">change everything.</text>
          </svg>
          <span className="visual-caption"><span className="tiny-cross">+</span> A LEVER, DOING ITS THING</span>
        </div>
      </section>

      <section className="workshop" id="machines" aria-labelledby="workshop-title">
        <div className="section-heading"><div><div className="eyebrow muted">THE WORKSHOP</div><h2 id="workshop-title">Pick your first discovery.</h2></div><span className="available-count"><span className="status-dot" /> 2 machines ready to play</span></div>
        <div className="machine-grid">
          {machines.map(machine => {
            const count = challenges[machine.id].filter(c => completed.includes(c.id)).length;
            return <button key={machine.id} className={`machine-card ${machine.id}`} onClick={() => open(machine.id)}>
              <div className="card-art"><span className="card-number">EXPERIMENT {machine.number}</span><MachineIllustration machine={machine.id} /><span className="card-open"><ArrowUpRight size={23} /></span></div>
              <div className="card-content"><div className="card-title-row"><h3>{machine.title}</h3><span className="concept-tag">{machine.concept}</span></div><div className="card-subtitle">{machine.subtitle}</div><p>{machine.description}</p><div className="card-footer"><span>{count ? <><Check size={14} /> {count}/3 discoveries made</> : <><span className="difficulty-dots"><i /><i /><i /></span> Simple to start</>}</span><strong>Explore machine <ArrowRight size={17} /></strong></div></div>
            </button>;
          })}
        </div>
      </section>

      <ProblemPanel />
      <section className="how-it-works" aria-label="How to explore">
        <div className="how-intro"><span className="eyebrow muted">A GOOD WAY TO PLAY</span><h2>Wonder.<br /><span className="serif-italic">Then find out.</span></h2></div>
        <div className="how-step"><span className="step-icon"><MousePointer2 size={21} /></span><h3>Get a closer look</h3><p>Tap any part to see what it is and why it matters.</p></div>
        <div className="how-step"><span className="step-icon"><SlidersHorizontal size={21} /></span><h3>Try a little change</h3><p>A heavier load? A different pivot? You’re in charge.</p></div>
        <div className="how-step"><span className="step-icon"><Sparkles size={21} /></span><h3>Follow your “what if”</h3><p>Watch what happens. Make a prediction. Try again.</p></div>
      </section>
    </main>
    <footer className="site-footer"><span>Small machines. Big possibilities.</span><span>Built for play. Powered by curiosity.<span className="footer-mark">✳</span></span></footer>
  </div>;
}
