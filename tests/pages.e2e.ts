import { test, expect } from '@playwright/test';

test('static subpath demo loads assets, both machines, examples and undo without API calls', async ({ page }) => {
  const failures: string[] = [];
  const apiCalls: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(`${request.failure()?.errorText} ${request.url()}`));
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url()); });
  await page.goto('./');
  await expect(page.locator('.agent-connection')).toHaveText('Public demo · local examples only');
  await expect(page.locator('#problem-input')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Build my experiment' })).toHaveCount(0);
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(favicon).toBe('/MachinePlayground/favicon.svg');
  expect((await page.request.get(favicon!)).status()).toBe(200);
  await page.getByRole('button', { name: 'A little push', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  await page.getByRole('button', { name: 'Play simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause simulation', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Share the lift', exact: true }).click();
  await expect(page.locator('.problem-overlay')).toContainText('PULLEY');
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('100 J');
  await page.getByRole('button', { name: 'Undo setup' }).click();
  await expect(page.getByTestId('problem-answer')).toHaveText('39.2 N');
  await page.getByRole('button', { name: 'Highlight the effort pad' }).click();
  await expect(page.locator('.part-details')).toContainText('effort');
  await page.getByRole('slider', { name: 'Push speed', exact: true }).fill('0.3');
  await expect(page.locator('.problem-result')).toHaveCount(0);
  expect(apiCalls).toEqual([]);
  expect(failures).toEqual([]);
});

test('mobile demo and machine controls fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByRole('button', { name: 'A little push', exact: true }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#canvas-controls-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.locator('#canvas-controls-toggle').click();
  await expect(page.getByRole('slider', { name: 'Push speed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Share the lift', exact: true }).click();
  await expect(page.locator('.problem-overlay')).toContainText('PULLEY');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
