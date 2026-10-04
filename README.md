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
- Adjustable load, input speed, fulcrum position, pulley arrangement, wheel radius, and friction.
- Selectable and highlighted parts with a sidecar inspector. A DOM part picker supports keyboard and touch interaction.
- Orbit and zoom, pause/play, reset (including camera), and fullscreen where supported.
- Three experiments per machine, with feedback and progress saved locally. Storage failures are handled.
- A WebGL error fallback that keeps controls and educational content available.

Space pauses/resumes when focus is outside a control. Escape clears part selection. Sliders work with arrow keys. Part picker buttons mirror canvas selection.

## Physics and limitations

These are quasi-static educational models, not rigid-body simulations. Parts and rope are massless; rope does not stretch. Speed is the input along the lifting stroke. The animation lifts then returns to demonstrate repeated operation; measurements always describe the lifting stroke, rather than claiming power during the reset stroke.

For the lever, `MA = effort arm / load arm`. Fulcrum position is measured from the load end of a 3.6 m beam. Required effort is `mass × 9.81 / MA` and load speed is `input speed / MA`. The displayed angular motion derives from input displacement, so both ends obey the arm-length ratio.

For the pulley, `MA = supporting rope sections`: one for a fixed pulley, two with a moving pulley. Load speed is rope speed divided by MA. Rope endpoint movement preserves the rope length in both arrangements. Wheel radius changes angular speed, not mechanical advantage.

Friction uses a fixed efficiency of 80%: `effort = weight / (MA × efficiency)`. Input power is effort × input speed; useful output power is weight × load speed. Force and power are calculated, not independent controls. Mounting bolts are inspect-only fasteners.

## Architecture and expansion

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Zustand, and Vitest. Domain definitions live in `src/machines.ts`; pure physics and challenges in `src/physics.ts`; state in `src/store.ts`. Scene transforms run through refs in `useFrame`, without per-frame React state updates. The 3D workshop loads separately from the machine library.

To add another machine, extend the machine ID and registry, add settings/calculations and challenges, and provide a scene through `LabStage`. Reuse `SelectablePart`, controls, measurements, and the inspector. Gears and inclined planes are natural next additions.

Fonts are bundled locally through Fontsource, with system fallbacks. All illustrations, models, fonts, and icons are supplied by the app and its dependencies. No external asset requests, API keys, backend, or account required.

## Publish

Run `npm run build` and deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, etc.). Build command: `npm run build`. Output directory: `dist`. No client-side URL routing or server rewrites are required. For hosting under a subpath, configure Vite’s `base` and adjust the favicon path accordingly.

This repository does not automatically deploy or require a hosting account.

## Git hooks

Enable the supplied hooks after cloning:

```sh
git config core.hooksPath .githooks
```

The pre-commit hook checks staged whitespace, physics tests, TypeScript, and the production build. The commit-message hook enforces `<type>: <description>`, a maximum 72-character subject, and no trailing period. Never skip hooks with `--no-verify`.
