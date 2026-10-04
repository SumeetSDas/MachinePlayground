import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { PNG } from 'pngjs';

async function setSlider(page: Page, id: string, steps: number) {
  const slider = page.locator(`#${id}`);
  await slider.focus();
  await slider.press('Home');
  for (let i = 0; i < steps; i++) await slider.press('ArrowRight');
}

async function openMachine(page: Page, machine: 'lever' | 'pulley') {
  await page.goto('/');
  await page.locator(`.machine-card.${machine}`).click();
  await expect(page.locator('canvas')).toBeVisible();
  const toggle = page.locator('.canvas-controls-toggle');
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

function pixelDifference(a: Buffer, b: Buffer) {
  const first = PNG.sync.read(a);
  const second = PNG.sync.read(b);
  let changed = 0;
  for (let i = 0; i < first.data.length; i += 4) {
    if (Math.abs(first.data[i] - second.data[i]) + Math.abs(first.data[i + 1] - second.data[i + 1]) + Math.abs(first.data[i + 2] - second.data[i + 2]) > 35) changed++;
  }
  return changed;
}

test('lever controls, challenge feedback, part inspection, and saved discoveries', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openMachine(page, 'lever');
  await page.getByRole('button', { name: 'Test my setup' }).click();
  await expect(page.locator('.challenge-feedback')).toContainText('Try a fulcrum position of 25% or less');
  await setSlider(page, 'pivot', 3); // 20%, 4× advantage; minimum respects lift geometry
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('24.5');
  await expect(page.locator('.measurement-grid > div').nth(2)).toContainText('4.0');
  await page.getByRole('button', { name: 'Test my setup' }).click();
  await expect(page.locator('.challenge-feedback')).toContainText('You did it');
  await page.getByRole('button', { name: 'beam', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The beam', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mounting bolts', exact: true }).click();
  await expect(page.locator('.part-details')).toContainText('fastener');
  await page.getByRole('button', { name: 'Reset experiment and camera' }).click();
  await expect(page.locator('#pivot')).toHaveValue('28');
  await expect(page.locator('.part-details')).toHaveCount(0);
  await page.getByRole('button', { name: 'All machines', exact: true }).click();
  await expect(page.locator('.machine-card.lever')).toContainText('1/3 discoveries made');
  await page.reload();
  await expect(page.locator('.machine-card.lever')).toContainText('1/3 discoveries made');
  expect(errors).toEqual([]);
});

test('pulley arrangement, friction, radius, and conditional parts work together', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openMachine(page, 'pulley');
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('98.0');
  await page.getByRole('button', { name: 'Add a moving wheel' }).click();
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('49.0');
  await expect(page.locator('.measurement-grid > div').nth(1)).toContainText('0.10');
  await page.getByRole('button', { name: 'moving wheel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The moving wheel', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'One fixed wheel' }).click();
  await expect(page.locator('.part-details')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'moving wheel', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add a moving wheel' }).click();
  await page.getByRole('switch', { name: 'Add a little friction' }).click();
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('61.3');
  await expect(page.locator('.measurement-grid > div').nth(3)).toContainText('12.3');
  await setSlider(page, 'radius', 0);
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('61.3');
  await page.getByRole('button', { name: 'frame', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The frame', exact: true })).toBeVisible();
  await page.screenshot({ path: '.verification/pulley-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Try the lever' }).click();
  await expect(page.getByRole('heading', { name: 'The lever', exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('canvas contains the machine, animates, and freezes when paused', async ({ page }) => {
  await openMachine(page, 'lever');
  const canvas = page.locator('canvas');
  const first = await canvas.screenshot();
  await page.waitForTimeout(700);
  const second = await canvas.screenshot();
  expect(pixelDifference(first, second)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.waitForTimeout(300);
  const paused = await canvas.screenshot();
  await page.waitForTimeout(500);
  expect(pixelDifference(paused, await canvas.screenshot())).toBeLessThan(50);
  const png = PNG.sync.read(paused);
  let colored = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
    if ((r > g * 1.15 && r > b * 1.2) || (g > r * 1.12 && g > b * 0.9 && g < 150)) colored++;
  }
  expect(colored).toBeGreaterThan(1000);
  // Select an actual green fulcrum pixel, independent of responsive framing.
  const greenPixels: { x: number; y: number }[] = [];
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
    if (g > r * 1.25 && g > b * 1.02 && r < 120) greenPixels.push({ x: (i / 4) % png.width, y: Math.floor(i / 4 / png.width) });
  }
  expect(greenPixels.length).toBeGreaterThan(100);
  const pixel = greenPixels[Math.floor(greenPixels.length * 0.6)];
  const bounds = await canvas.boundingBox();
  await canvas.click({ position: { x: pixel.x / png.width * bounds!.width, y: pixel.y / png.height * bounds!.height } });
  await expect(page.locator('.part-details')).toBeVisible();
  await page.screenshot({ path: '.verification/lever-desktop.png', fullPage: true });
  await page.locator('h1').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.part-details')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause simulation' })).toBeVisible();
});

test('mobile library and both labs stay within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: '.verification/library-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('.machine-card.lever').click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'fulcrum', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The fulcrum', exact: true })).toBeVisible();
  await page.screenshot({ path: '.verification/lever-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Try the pulley' }).click();
  await page.getByRole('button', { name: 'Controls', exact: true }).click();
  await page.getByRole('button', { name: 'Add a moving wheel' }).click();
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('49.0');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.screenshot({ path: '.verification/pulley-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('canvas controls collapse without losing settings and part links reopen them', async ({ page }) => {
  await openMachine(page, 'lever');
  const toggle = page.locator('.canvas-controls-toggle');
  const canvas = page.locator('canvas');
  await setSlider(page, 'pivot', 3);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  const openWidth = (await canvas.boundingBox())!.width;
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#pivot')).toBeHidden();
  await expect.poll(async () => (await canvas.boundingBox())!.width).toBeGreaterThan(openWidth);
  await expect(page.getByRole('button', { name: 'Play simulation' })).toBeVisible();
  await page.getByRole('button', { name: 'fulcrum', exact: true }).click();
  await page.getByRole('button', { name: 'Try changing it' }).click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#pivot')).toBeFocused();
  await expect(page.locator('#pivot')).toHaveValue('20');
  await expect(page.locator('.scene-stage #pivot')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play simulation' })).toBeVisible();
  await toggle.focus();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('mobile controls are tucked away and the open tray leaves the machine visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('.machine-card.pulley').click();
  const toggle = page.locator('.canvas-controls-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mass')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(async () => (await page.locator('canvas').boundingBox())!.height).toBeGreaterThan(250);
  const canvas = (await page.locator('canvas').boundingBox())!;
  const panel = (await page.locator('.canvas-controls').boundingBox())!;
  expect(canvas.height).toBeGreaterThan(250);
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(panel.y + 10);
  await page.getByRole('button', { name: 'Add a moving wheel' }).click();
  await page.getByRole('switch', { name: 'Add a little friction' }).click();
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('61.3');
  await toggle.click();
  await expect(page.locator('#friction')).toBeHidden();
  await page.getByRole('button', { name: 'axle', exact: true }).click();
  await page.getByRole('button', { name: 'Try changing it' }).click();
  await expect(page.locator('#friction')).toBeFocused();
  await expect(page.locator('#friction')).toBeVisible();
  await expect(page.locator('#friction')).toHaveAttribute('aria-checked', 'true');
  const focusedCanvas = (await page.locator('canvas').boundingBox())!;
  expect(focusedCanvas.y).toBeGreaterThanOrEqual(0);
  expect(focusedCanvas.y + focusedCanvas.height).toBeLessThan(844);
  await expect(page.locator('.canvas-controls')).toBeInViewport();
  await page.screenshot({ path: '.verification/canvas-controls-mobile-focused.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('no remote assets are required and blocked local storage is tolerated', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (request.url().startsWith('http') && !request.url().startsWith('http://localhost:5173')) externalRequests.push(request.url()); });
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } }); });
  await openMachine(page, 'lever');
  await setSlider(page, 'pivot', 0);
  await page.getByRole('button', { name: 'Test my setup' }).click();
  await expect(page.locator('.challenge-feedback')).toContainText('You did it');
  await page.getByRole('button', { name: 'Try the pulley' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('exact lever problem changes geometry and solves effort, distance, and work', async ({ page }) => {
  await openMachine(page, 'lever');
  await page.getByText('Exact problem parameters', { exact: true }).click();
  async function exact(id: string, value: string) { await page.locator(`#${id}`).fill(value); await page.locator(`#${id}`).press('Enter'); }
  await exact('mass-exact', '12');
  await exact('lift-distance', '0.1');
  await exact('load-arm', '0.5');
  await exact('effort-arm', '1.5');
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('39.2');
  await expect(page.locator('.stroke-measurements')).toContainText('Input travel 0.30 m');
  await expect(page.locator('.stroke-measurements')).toContainText('Useful work 11.76 J');
  await expect(page.locator('.measurements-top')).toContainText('g = 9.8');
  await exact('lift-distance', '0.5');
  await expect(page.locator('.configuration-error')).toContainText('at most');
  await expect(page.locator('.stroke-measurements')).toContainText('Lift 0.10 m');
  await exact('lift-distance', '0.1');
  await expect(page.locator('.configuration-error')).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.screenshot({ path: '.verification/phase-one-lever.png', fullPage: true });
});

test('weight entry, variable gravity, and efficiency stay consistent', async ({ page }) => {
  await openMachine(page, 'pulley');
  await page.getByRole('button', { name: 'Weight · N', exact: true }).click();
  await page.locator('#weight').fill('100');
  await page.locator('#weight').press('Enter');
  await page.getByRole('button', { name: 'Add a moving wheel' }).click();
  await page.getByText('Exact problem parameters', { exact: true }).click();
  await page.locator('#gravity').fill('1.62');
  await page.locator('#gravity').press('Enter');
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('50.0');
  await page.locator('#efficiency').fill('50');
  await page.locator('#efficiency').press('Enter');
  await expect(page.locator('.measurement-grid > div').nth(0)).toContainText('100.0');
  await page.locator('#lift-distance').fill('2');
  await page.locator('#lift-distance').press('Enter');
  await expect(page.locator('.stroke-measurements')).toContainText('Input travel 4.00 m');
  await expect(page.locator('.stroke-measurements')).toContainText('Useful work 200.00 J');
  await page.getByRole('button', { name: 'Pause simulation' }).click();
  await page.screenshot({ path: '.verification/phase-one-pulley.png', fullPage: true });
});
