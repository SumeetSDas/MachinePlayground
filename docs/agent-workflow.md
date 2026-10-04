# Problem-to-scene agent: implementation plan

## Status

Phase one is implemented locally: configurable gravity (9.8 m/s² by default), lever arms, lift distance, efficiency, mass/weight entry, SI unit conversion, validation, deterministic physics, and an atomic experiment-application method. The scenes share the kinematic functions with the tests. These remain quasi-static educational models; force-driven acceleration is out of scope.

The text input, server endpoint, language-model interpreter, clarification conversation, answer-reveal UI, follow-up history, and undo are planned. No model call, API credential, or server is present in this phase. The visualization distinguishes the implemented foundation from the proposed agent roles.

## Intended user journey

Enter a lever or pulley word problem in a text box above the canvas. The proposed endpoint sends the problem and minimal current experiment context to a language model. The model returns structured quantities and units, the requested unknown, and explicit assumptions; it never returns code or arbitrary mesh instructions.

The interpreter must keep given, assumed, and calculated quantities distinct. Unknown machine arrangements, missing quantities that prevent a solution, incompatible units, or contradictory givens require a clarification. Model/network failure leaves the current scene intact. Limit input length and requests, keep credentials on the server, and treat all model output as untrusted data.

## Responsibilities

1. Problem UI (planned): text input, examples, given/assumed quantity summary, pending/error state, and follow-up question. Preserve the current experiment until a valid replacement is complete.
2. Server endpoint (planned): bounded model request, timeout, rate limit, credentials on server only. Include supported concepts and structured output contract.
3. Language interpreter (planned): extract machine, quantities with units, unknown, assumptions, and a clarification when necessary. Arithmetic and scene construction belong to deterministic code.
4. Typed validation (foundation implemented; interpretation adapter planned): normalize classroom units to SI, reject unsupported arrangements and physical/rendering limits, and ask for missing or conflicting information. Never clamp a problem silently.
5. Physics solver (implemented): compute mechanical advantage, weight, effort, speed, power, travel, work, time, and kinematic transforms. This is the authority for answers, not the language model.
6. Scene configuration (implemented atomic method; agent caller planned): validate a complete configuration before applying it to Zustand. Switch machine, clear selection, reset the stroke, and begin paused for prediction. No partial writes on failure.
7. React Three Fiber scenes (implemented): derive geometry and motion from settings, frame the machine to fit, and preserve selectable parts. Proposed overlays will mark the problem's givens and unknowns.
8. Explanation and history (planned): reveal solver-derived equations and answers on request; snapshots support undo and contextual follow-ups. Any model-written explanation must agree with computed quantities.

## Example contract (proposed interpreter output)

```json
{
  "machine": "lever",
  "givens": {
    "mass": { "value": 12, "unit": "kg" },
    "loadArm": { "value": 0.5, "unit": "m" },
    "effortArm": { "value": 1.5, "unit": "m" },
    "gravity": { "value": 9.8, "unit": "m/s²" }
  },
  "unknown": "effort",
  "assumptions": ["Ideal machine", "Vertical forces", "Constant-speed lift"],
  "visualDefaults": { "liftDistance": 0.1, "inputSpeed": 0.2 }
}
```

Visual defaults are demonstration settings, not invented problem givens. This example has 3× advantage and a required effort of 39.2 N. The 0.1 m illustrative stroke requires 0.3 m input travel and 11.76 J useful work.

## Phase-one supported limits

- Mass: 0.01–1000 kg. Weight input converts to mass using the selected gravity; changing gravity preserves the explicitly entered quantity.
- Gravity: 0.1–30 m/s². Ideal efficiency is 100%; the simplified friction setting accepts 10–100%.
- Lever: each arm 0.2–3 m, with a maximum 0.35 rad (about 20°) lifting stroke. Lift must fit the load arm's geometry.
- Pulley: one or two supporting rope sections, radius 0.1–0.5 m, lift up to 2 m. Support and rope geometry grow to accommodate the stroke.
- Input speed: 0.01–2 m/s. Lift: at least 0.01 m. Force and power remain derived, not independent controls.

Future interpretation must explain when a problem exceeds these supported limits. Adding acceleration, multi-block tackles, massive beams/wheels, elastic ropes, or contact mechanics requires separate model work.

## Verification for the next phase

Use representative problems and follow-ups to test extraction, SI units, missing quantities, contradictory inputs, gravity overrides, and unrepresentable geometry. Assert no scene mutation on model failure or invalid output, agreement between solver and explanation, correct unknown highlighting, undo, keyboard input, and responsive canvas controls.
