import { useEffect, useState } from 'react';
import { ArrowRight, CornerDownLeft, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { examples, MAX_PROBLEM_LENGTH, unknownLabels } from '../agent/problem';
import { useLab } from '../store';
import { STATIC_DEMO } from '../runtime';

export default function ProblemPanel() {
  const state = useLab();
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (STATIC_DEMO) return;
    const controller = new AbortController();
    void fetch('/api/agent/status', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then((data: unknown) => setConnected(typeof data === 'object' && data !== null && 'configured' in data && data.configured === true)).catch(() => { if (!controller.signal.aborted) setConnected(false); });
    return () => controller.abort();
  }, []);
  const pending = state.problemStatus === 'pending';
  const followup = state.problemContext !== null;
  const problem = state.problem;
  return <section className="problem-panel" aria-labelledby="problem-panel-title">
    <div className="problem-heading"><div><span className="eyebrow muted"><Sparkles size={13} /> A PROBLEM. A LITTLE EXPERIMENT.</span><h2 id="problem-panel-title">{STATIC_DEMO ? 'Pick a problem. Try it for yourself.' : 'Turn words into something you can try.'}</h2></div><span className={`agent-connection ${connected ? 'connected' : ''}`}>{STATIC_DEMO ? 'Public demo · local examples only' : connected === null ? 'Checking interpreter…' : connected ? 'AI interpreter connected' : 'AI not connected · examples available'}</span></div>
    {STATIC_DEMO ? <p className="model-note">Explore both machines, change their controls, and try the prepared problems below. Free-form AI problems need a server and are not available in this GitHub Pages demo. No problem text is sent to an AI service.</p> : <form onSubmit={event => { event.preventDefault(); void state.submitProblem(); }}>
      <label className="problem-input-label" htmlFor="problem-input">{followup ? state.problemStatus === 'clarification' ? 'Answer the question or revise the problem' : 'Ask a follow-up about this problem' : 'Your lever or pulley problem'}</label>
      <textarea id="problem-input" value={state.problemDraft} onChange={event => state.setProblemDraft(event.target.value)} maxLength={MAX_PROBLEM_LENGTH} disabled={pending} rows={3} placeholder={followup ? 'What if the load is twice as heavy?' : 'A lever lifts 12 kg. Its load arm is 50 cm and effort arm is 150 cm. What force is needed?'} aria-describedby="problem-input-help" onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); if (!pending) void state.submitProblem(); } }} />
      <div className="problem-actions"><span id="problem-input-help">{pending ? 'Reading → checking units → solving → configuring the scene…' : 'Lever or pulley · no personal details needed'} <span>{state.problemDraft.length}/{MAX_PROBLEM_LENGTH}</span></span><div>{followup && <button className="text-button" type="button" onClick={state.newProblem} disabled={pending}><RotateCcw size={13} /> New problem</button>}{pending ? <button className="problem-submit" type="button" onClick={state.cancelProblem}>Cancel</button> : <button className="problem-submit" type="submit" disabled={!state.problemDraft.trim()}>{followup ? 'Update experiment' : 'Build my experiment'} <ArrowRight size={15} /></button>}</div></div>
    </form>}
    <div className="problem-examples"><span>Try a prepared example</span>{examples.map(example => <button type="button" disabled={pending} key={example.id} onClick={() => state.applyProblem(example.problem, example.interpretation, 'example')}>{example.title} <CornerDownLeft size={12} /></button>)}<small>These examples run locally, without an AI call.</small></div>
    {state.problemMessage && <div className={`problem-feedback ${state.problemStatus}`} role={state.problemStatus === 'error' ? 'alert' : 'status'}>{state.problemStatus === 'clarification' && <strong>One thing to clarify</strong>}<p>{state.problemMessage}</p></div>}
    {problem && <div className="problem-result">
      <div className="problem-result-heading"><span>{problem.source === 'example' ? 'PREPARED EXAMPLE' : 'AI-INTERPRETED · CODE-VERIFIED'} · {problem.result.configuration.machine.toUpperCase()}</span><button className="text-button" type="button" onClick={state.undoProblem} disabled={pending}><Undo2 size={13} /> Undo setup</button></div>
      <p className="problem-original">{problem.text}</p>
      <div className="problem-facts"><div><h3>Given in the problem</h3><ul>{problem.result.givens.map(given => <li key={given}>{given}</li>)}</ul></div><div><h3>Model assumptions</h3><ul>{problem.result.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul>{problem.result.visualDefaults.length > 0 && <details><summary>Illustration defaults, not givens</summary><ul>{problem.result.visualDefaults.map(value => <li key={value}>{value}</li>)}</ul></details>}</div></div>
      <div className="problem-answer"><div><span>FIND {unknownLabels[problem.result.interpretation.unknown!].toUpperCase()}</span>{state.problemRevealed ? <><strong data-testid="problem-answer">{Number(problem.result.answer.value.toPrecision(6))} {problem.result.answer.unit}</strong><code>{problem.result.answer.equation}</code><small>Calculated by the physics solver, not the language model.</small></> : <p>The machine starts paused. Make a prediction, then test it.</p>}</div>{!state.problemRevealed && <button className="problem-submit" type="button" onClick={state.revealProblem}>Reveal answer <ArrowRight size={15} /></button>}</div>
    </div>}
    {!problem && state.history.length > 0 && <button className="text-button problem-undo" type="button" onClick={state.undoProblem} disabled={pending}><Undo2 size={13} /> Restore previous experiment</button>}
  </section>;
}
