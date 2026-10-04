import { test, expect } from '@playwright/test';
import { examples } from '../src/agent/problem';

test('prepared examples configure scenes, reveal code-derived answers and undo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'A little push', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The lever', exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeVisible();
  await expect(page.locator('.problem-result')).toContainText('Load arm: 50 cm');
  await expect(page.locator('.problem-overlay')).toContainText('Effort force: ?');
  await expect(page.locator('.measurement-grid > div').first()).toContainText('?');
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  await expect(page.locator('.problem-overlay')).toContainText('39.2 N');
  await page.getByRole('button', { name: 'Highlight the effort pad' }).click();
  await expect(page.locator('.part-details')).toContainText('effort');
  await page.screenshot({ path: '.verification/agent-lever.png', fullPage: true });
  await page.getByRole('button', { name: 'Share the lift' }).click();
  await expect(page.locator('.problem-overlay')).toContainText('PULLEY');
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('100 J');
  await page.getByRole('button', { name: 'Undo setup' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  await page.getByRole('button', { name: 'Undo setup' }).click();
  await expect(page.locator('.machine-card.lever')).toBeVisible();
});

test('AI endpoint clarification and contextual follow-up apply only complete settings', async ({ page }) => {
  await page.route('**/api/agent/status', route => route.fulfill({ json: { configured: true } }));
  let call = 0;
  const requests: { problem: string; context: unknown }[] = [];
  const missing = { ...examples[0].interpretation, quantities: examples[0].interpretation.quantities.filter(q => q.parameter !== 'effortArm') };
  await page.route('**/api/agent/interpret', async route => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { interpretation: call++ === 0 ? missing : examples[0].interpretation } });
  });
  await page.goto('/');
  await page.locator('.machine-card.lever').click();
  await page.locator('#problem-input').fill('A lever problem with no effort arm');
  await page.getByRole('button', { name: 'Build my experiment' }).click();
  await expect(page.locator('.problem-feedback')).toContainText('Please provide effort arm');
  await expect(page.locator('.measurement-grid > div').first()).toContainText('38.1');
  await page.locator('#problem-input').fill('The effort arm is 150 cm');
  await page.locator('#problem-input').press('Control+Enter');
  await expect(page.locator('.problem-result')).toContainText('AI-INTERPRETED');
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  expect(requests[0].context).toBeNull();
  expect(requests[1].context).toEqual(missing);
  await page.getByRole('button', { name: 'New problem', exact: true }).click();
  await page.locator('#problem-input').fill('A fresh problem');
  await page.getByRole('button', { name: 'Build my experiment' }).click();
  await expect(page.getByRole('button', { name: 'Reveal answer' })).toBeVisible();
  expect(requests[2].context).toBeNull();
});

test('failure, malformed model output and cancel leave the current scene unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'A little push', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  let mode = 'failure';
  await page.route('**/api/agent/interpret', async route => {
    if (mode === 'failure') await route.fulfill({ status: 502, json: { error: 'Interpreter unavailable' } });
    else if (mode === 'invalid') await route.fulfill({ json: { interpretation: { meshCode: 'not allowed' } } });
    else { await new Promise(resolve => setTimeout(resolve, 500)); await route.fulfill({ json: { interpretation: examples[1].interpretation } }).catch(() => {}); }
  });
  await page.locator('#problem-input').fill('Make a change');
  await page.getByRole('button', { name: 'Update experiment' }).click();
  await expect(page.getByRole('alert')).toContainText('Interpreter unavailable');
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  mode = 'invalid';
  await page.getByRole('button', { name: 'Update experiment' }).click();
  await expect(page.getByRole('alert')).toContainText('invalid format');
  mode = 'cancel';
  await page.getByRole('button', { name: 'Build my experiment' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
});

test('mobile problem form stays inside the viewport and input does not trigger playback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'A lift on the Moon' }).click();
  await page.locator('#problem-input').fill('What if ');
  await page.locator('#problem-input').press('Space');
  await expect(page.getByRole('button', { name: 'Play simulation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('16.2 N');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.verification/agent-mobile.png', fullPage: true });
});

test('missing server credentials are reported without pretending a model ran', async ({ page }) => {
  await page.route('**/api/agent/status', route => route.fulfill({ json: { configured: false } }));
  await page.route('**/api/agent/interpret', route => route.fulfill({ status: 503, json: { error: 'AI is not connected. Set OPENAI_API_KEY in the server environment.' } }));
  await page.goto('/');
  await expect(page.locator('.agent-connection')).toContainText('AI not connected');
  await page.locator('#problem-input').fill(examples[0].problem);
  await page.getByRole('button', { name: 'Build my experiment' }).click();
  await expect(page.getByRole('alert')).toContainText('OPENAI_API_KEY');
  await expect(page.locator('.machine-card.lever')).toBeVisible();
  await expect(page.locator('.problem-result')).toHaveCount(0);
});
