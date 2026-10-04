# Problem-to-scene agent: implementation plan

## Status

Phase one is implemented locally: configurable gravity (9.8 m/s² by default), lever arms, lift distance, efficiency, mass/weight entry, SI unit conversion, validation, deterministic physics, and an atomic experiment-application method. The scenes share the kinematic functions with the tests. These remain quasi-static educational models; force-driven acceleration is out of scope.

The `feat/problem-to-scene-agent` branch implements the text input, server endpoint, language interpreter, clarification context, answer reveal, scene annotations, and ten-snapshot in-memory undo. Free-form interpretation requires a server-side API key; without it, the UI reports “AI not connected” and labelled prepared examples remain usable. Live provider behavior is not verified without credentials; automated tests use structured fixtures and a mocked provider transport.

The [interactive architecture diagram](../.archify/architecture-agent-setup-20261004-141949/agent-setup.html) is a frozen phase-one planning snapshot; its “planned” labels describe that earlier revision, not the current branch. Its [handoff record](../.archify/architecture-agent-setup-20261004-141949/handoff.json) links the frozen specification, artifact hashes, and verification evidence.

## Current implementation

- `src/components/ProblemPanel.tsx`: problem box in the library and labs, labelled offline examples, status, clarification, givens/assumptions/defaults, prediction and reveal.
- `server/api.ts` and `server/interpret.ts`: same-origin bounded request, server-only credential, Responses structured output, no tools/code, safe failures. Development runs within Vite; production uses `server/index.ts` behind a same-origin reverse proxy.
- `src/agent/problem.ts`: strict extraction schema, dimension-aware SI normalization, required-given checks, duplicate/conflict rejection, representable configuration, and deterministic equations. Assumptions and illustrative motion defaults are authored by code, not invented by the model.
- `src/store.ts`: one atomic state update, start paused, stale/cancelled response protection, extraction-only follow-up context, undo snapshots. Valid manual changes clear the prior answer and annotations.
- Scene part highlighting and a canvas overlay identify the requested quantity. The requested measurement stays hidden until reveal; other measurements remain exploratory and may make the answer inferable.
- Server/browser tests cover missing credentials, structured transport, limits, clarification, contextual follow-up, validation, failures, cancellation, undo, and responsive layout. No live provider call is made by tests.

Production hardening still needs edge authentication, shared quotas, provider spend limits and deployment configuration. Inverse problems (e.g. finding mass from applied effort), acceleration, persistent conversations, and model-generated prose explanations are not implemented. Explanations currently use solver-authored equations, avoiding disagreement with model-written arithmetic.

## Intended user journey

Enter a lever or pulley word problem in a text box above the canvas. The proposed endpoint sends the problem and minimal current experiment context to a language model. The model returns structured quantities and units, the requested unknown, and explicit assumptions; it never returns code or arbitrary mesh instructions.

The interpreter must keep given, assumed, and calculated quantities distinct. Unknown machine arrangements, missing quantities that prevent a solution, incompatible units, or contradictory givens require a clarification. Model/network failure leaves the current scene intact. Limit input length and requests, keep credentials on the server, and treat all model output as untrusted data.

## Responsibilities

1. Problem UI (implemented): text input, examples, given/assumed quantity summary, pending/error state, and follow-up question. Preserve the current experiment until a valid replacement is complete.
2. Server endpoint (implemented): bounded model request, timeout, per-process rate limit, credentials on server only. Include supported concepts and structured output contract.
3. Language interpreter (implemented; live key required): extract machine, quantities with units, unknown, and a clarification when necessary. Arithmetic, model assumptions and scene construction belong to deterministic code.
4. Typed validation (implemented): normalize classroom units to SI, reject unsupported arrangements and physical/rendering limits, and ask for missing or conflicting information. Never clamp a problem silently.
5. Physics solver (implemented): compute mechanical advantage, weight, effort, speed, power, travel, work, time, and kinematic transforms. This is the authority for answers, not the language model.
6. Scene configuration (implemented): validate a complete configuration before applying it to Zustand. Switch machine, clear selection, reset the stroke, and begin paused for prediction. No partial writes on failure.
7. React Three Fiber scenes (implemented): derive geometry and motion from settings, frame the machine to fit, and preserve selectable parts. Highlight the target part and annotate the requested unknown; givens appear in the adjacent summary.
8. Explanation and history (implemented): reveal solver-derived equations and answers on request; in-memory snapshots support undo and extraction context supports follow-ups. No model-written explanations are generated.

## Example interpreter contract

```json
{
  "machine": "lever",
  "status": "ready",
  "quantities": [
    { "parameter": "mass", "value": 12, "unit": "kg" },
    { "parameter": "loadArm", "value": 0.5, "unit": "m" },
    { "parameter": "effortArm", "value": 1.5, "unit": "m" },
    { "parameter": "gravity", "value": 9.8, "unit": "m/s²" }
  ],
  "unknown": "effort",
  "question": null
}
```

Visual defaults are demonstration settings, not invented problem givens. This example has 3× advantage and a required effort of 39.2 N. The 0.1 m illustrative stroke requires 0.3 m input travel and 11.76 J useful work.

The compiler, not this extraction, supplies default gravity, ideal efficiency, constant-speed model assumptions, and illustrative motion. Supported unknowns: effort, weight, advantage, loadSpeed, inputPower, inputDistance, outputWork, liftTime. Problems must give mass or weight and the lever arms or pulley arrangement; speed/travel are required when needed for the requested answer.

API guidance used: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) and [production best practices](https://developers.openai.com/api/docs/guides/production-best-practices).

## Phase-one supported limits

- Mass: 0.01–1000 kg. Weight input converts to mass using the selected gravity; changing gravity preserves the explicitly entered quantity.
- Gravity: 0.1–30 m/s². Ideal efficiency is 100%; the simplified friction setting accepts 10–100%.
- Lever: each arm 0.2–3 m, with a maximum 0.35 rad (about 20°) lifting stroke. Lift must fit the load arm's geometry.
- Pulley: one or two supporting rope sections, radius 0.1–0.5 m, lift up to 2 m. Support and rope geometry grow to accommodate the stroke.
- Input speed: 0.01–2 m/s. Lift: at least 0.01 m. Force and power remain derived, not independent controls.

Future interpretation must explain when a problem exceeds these supported limits. Adding acceleration, multi-block tackles, massive beams/wheels, elastic ropes, or contact mechanics requires separate model work.

## Verification for the next phase

Use representative problems and follow-ups to test extraction, SI units, missing quantities, contradictory inputs, gravity overrides, and unrepresentable geometry. Assert no scene mutation on model failure or invalid output, agreement between solver and explanation, correct unknown highlighting, undo, keyboard input, and responsive canvas controls.
