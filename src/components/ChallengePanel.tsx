import { useState } from 'react';
import { ArrowRight, Check, Lightbulb, Sparkles } from 'lucide-react';
import type { MachineId } from '../machines';
import { challenges } from '../physics';
import { useLab } from '../store';

export default function ChallengePanel({ machine }: { machine: MachineId }) {
  const completed = useLab(s => s.completed);
  const settings = useLab(s => s.settings[machine]);
  const [index, setIndex] = useState(() => {
    const next = challenges[machine].findIndex(c => !completed.includes(c.id));
    return next === -1 ? 0 : next;
  });
  const [feedback, setFeedback] = useState<'success' | 'hint' | null>(null);
  const challenge = challenges[machine][index];
  const done = completed.includes(challenge.id);
  function next() { setIndex((index + 1) % challenges[machine].length); setFeedback(null); }
  return <section className={`challenge-panel ${feedback === 'success' ? 'challenge-success' : ''}`} aria-labelledby="challenge-heading">
    <div className="challenge-heading"><span className="eyebrow"><Sparkles size={14} /> A LITTLE CHALLENGE</span><div className="challenge-progress" aria-label={`${completed.filter(id => challenges[machine].some(c => c.id === id)).length} of 3 challenges completed`}>{challenges[machine].map((c, i) => <button key={c.id} aria-label={`Challenge ${i + 1}: ${c.title}${completed.includes(c.id) ? ', completed' : ''}`} aria-current={i === index ? 'step' : undefined} onClick={() => { setIndex(i); setFeedback(null); }}>{completed.includes(c.id) ? <Check size={12} /> : i + 1}</button>)}</div></div>
    <div className="challenge-body"><div><h2 id="challenge-heading">{challenge.title}{done && <Check size={18} />}</h2><p>{challenge.prompt}</p></div><button className="challenge-check" onClick={() => { if (challenge.test(settings)) { useLab.getState().complete(challenge.id); setFeedback('success'); } else setFeedback('hint'); }}>Test my setup <ArrowRight size={16} /></button></div>
    {feedback && <div className={`challenge-feedback ${feedback}`} role="status">{feedback === 'success' ? <Check size={17} /> : <Lightbulb size={17} />}<p>{feedback === 'success' ? challenge.success : challenge.hint}</p>{feedback === 'success' && <button onClick={next} aria-label="Next challenge"><ArrowRight size={19} /></button>}</div>}
  </section>;
}
