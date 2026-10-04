import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

test('Pages mode rejects free-form requests without touching the scene or network', async () => {
  vi.stubEnv('MODE', 'pages');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const { useLab } = await import('./store');
  const original = useLab.getState();
  useLab.getState().setProblemDraft('Solve a lever problem');
  await useLab.getState().submitProblem();
  expect(fetch).not.toHaveBeenCalled();
  expect(useLab.getState().settings).toBe(original.settings);
  expect(useLab.getState().machine).toBe(original.machine);
  expect(useLab.getState().problemMessage).toContain('prepared examples only');
});
