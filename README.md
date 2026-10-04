# Machine Playground

A browser workshop for curious minds: explore a lever and a pulley, change their parameters, select individual parts, and complete small experiments.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173.

```sh
npm test       # Force, speed, power, and challenge tests
npm run build # TypeScript checks and production bundle
npm run check # Both checks
npx playwright install chromium
npm run test:browser # Desktop/mobile interactions and canvas rendering
npm run preview
```

## What’s included

- Two illustrated machine cards and responsive workshop interfaces.
- Procedural React Three Fiber models; no downloaded models, textures, or images.
- Adjustable mass or weight, input speed, fulcrum position, exact lever arms, pulley arrangement, wheel radius, lift distance, gravity, and efficiency.
- A collapsible control panel inside the 3D workshop. It opens beside the machine on desktop and as a scrollable tray on mobile; collapsing it preserves the experiment. Part inspector links reopen the panel and focus the relevant setting.
- Selectable and highlighted parts with a sidecar inspector. A DOM part picker supports keyboard and touch interaction.
- Orbit and zoom, pause/play, reset (including camera), and fullscreen where supported.
- Three experiments per machine, with feedback and progress saved locally. Storage failures are handled.
- A WebGL error fallback that keeps controls and educational content available.
- A word-problem box in the library and labs, with a server-side AI interpreter, clarification and follow-up support, SI validation, solver-derived answers, scene annotations, and ten-step in-memory undo history.
- Labelled prepared examples that run locally without an AI call. Unknowns start hidden for prediction and can be revealed. Manual changes clear the old problem result so answers do not become stale.

Space pauses/resumes when focus is outside a control. Escape clears part selection. Sliders work with arrow keys. Part picker buttons mirror canvas selection.

## Physics and limitations

These are quasi-static educational models, not rigid-body simulations. Parts and rope are massless; rope does not stretch. Lever forces and input speed refer to the vertical direction. The animation lifts then returns to demonstrate repeated operation; measurements always describe the lifting stroke, rather than claiming power during the reset stroke. Gravity defaults to 9.8 m/s² and can be changed in “Exact problem parameters.”

For the lever, `MA = effort arm / load arm`. Beam length is the sum of configurable arm lengths (3.6 m by default). Required effort is `mass × gravity / MA` and load speed is `input speed / MA`. The displayed angle is derived from lift distance, so vertical displacement at both ends obeys the arm-length ratio. The model supports strokes up to 0.35 rad (~20°); impossible lifts are rejected with an explanation.

For the pulley, `MA = supporting rope sections`: one for a fixed pulley, two with a moving pulley. Load speed is rope speed divided by MA. Rope endpoint movement preserves the rope length in both arrangements. Wheel radius changes angular speed, not mechanical advantage.

Friction defaults to 80% efficiency and can be changed: `effort = weight / (MA × efficiency)`. Input power is effort × input speed; useful output power is weight × load speed. Work is force × distance; input travel is load lift × MA. Lift time is lift distance / load speed. Force and power are calculated, not independent controls. Mounting bolts are inspect-only fasteners.

Mass (kg) and weight (N) are explicitly distinct. In mass mode, changing gravity preserves mass; in weight mode it preserves the entered force and recalculates mass. SI conversion and validated atomic configuration application are available in `src/experiment.ts` and `src/store.ts`. Invalid parameters never partially modify an experiment or silently clamp its values.

The problem-to-scene workflow and its supported scope are documented in `docs/agent-workflow.md`.

## Connect the AI interpreter

Manual exploration and prepared examples need no account or key. Free-form problems and follow-ups require an OpenAI API key configured **only on the server**. Copy `.env.example` to an untracked `.env.local`, set `OPENAI_API_KEY`, optionally set `OPENAI_MODEL` (default `gpt-4o-mini`), and restart `npm run dev`. Never use a `VITE_` variable for secrets. Do not paste credentials into the problem input.

The Vite development server handles `/api/agent/status` and `/api/agent/interpret`. The interpreter uses the Responses API with a strict JSON schema, no tools, no retries, a 20-second provider timeout, 2048 output tokens, and `store: false`. Treat extracted data as untrusted: code checks units, required givens and renderable limits, then computes the answer. Model failure, cancellation, missing givens, conflicts, or stale responses do not replace the current scene. “New problem” clears context; follow-ups otherwise include the previous extraction, not arbitrary manual settings.

The gateway rejects cross-origin browser requests, bodies over 12 KB, and problems over 2000 characters. It permits at most eight requests per client per minute, 100 globally per minute, and three concurrent model requests per process. These local guardrails are not a production authentication or distributed quota system. Configure provider spend limits, edge authentication, and shared rate limits before public deployment. Word problems are transmitted to OpenAI; no personal data is needed.

## Architecture and expansion

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Zustand, and Vitest. Domain definitions live in `src/machines.ts`; pure physics and challenges in `src/physics.ts`; state in `src/store.ts`. Scene transforms run through refs in `useFrame`, without per-frame React state updates. The 3D workshop loads separately from the machine library.

To add another machine, extend the machine ID and registry, add settings/calculations and challenges, and provide a scene through `LabStage`. Reuse `SelectablePart`, controls, measurements, and the inspector. Gears and inclined planes are natural next additions.

Fonts are bundled locally through Fontsource, with system fallbacks. All illustrations, models, fonts, and icons are supplied by the app and its dependencies. No external assets are fetched. Only the optional AI interpreter requires a server and account.

## Publish

Run `npm run build` and deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Build command: `npm run build`. Output directory: `dist`. No client-side URL routing or server rewrites are required. For hosting under a subpath, configure Vite’s `base` and adjust the favicon path accordingly.

Static hosting supplies manual mode and examples only. To enable free-form AI problems, run `npm run api` as a Node service (defaults to loopback port 3001) and reverse-proxy `/api/agent/*` from the **same origin** to it. Use deployment secrets or `.env.local`. `npm run preview` already proxies those API paths to that local service; start both commands to test a production bundle. The service does not host static files. HTTPS, authentication, shared quotas, process supervision, and a provider budget remain deployment responsibilities. API routes currently assume hosting at the origin root.

This repository does not automatically deploy or require a hosting account.

## Git hooks

Enable the supplied hooks after cloning:

```sh
git config core.hooksPath .githooks
```

The pre-commit hook checks staged whitespace, physics tests, TypeScript, and the production build. The commit-message hook enforces `<type>: <description>`, a maximum 72-character subject, and no trailing period. Never skip hooks with `--no-verify`.
