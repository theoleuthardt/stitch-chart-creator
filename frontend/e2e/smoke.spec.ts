import { expect, Page, test } from '@playwright/test';
import { statSync } from 'node:fs';

const password = 'correct horse battery';

async function register(page: Page): Promise<void> {
  const name = `e2e${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await page.goto('/register');
  await page.getByLabel('Username').fill(name);
  await page.getByLabel('E-mail').fill(`${name}@example.com`);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('You have no charts yet.')).toBeVisible();
}

async function createChart(page: Page, title: string): Promise<void> {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Width').fill('30');
  await page.getByLabel('Height').fill('20');
  await page.getByRole('button', { name: 'Create chart' }).click();
  await expect(page.getByRole('status').first()).toHaveText('All changes saved');
}

async function draw(page: Page): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) {
    throw new Error('The canvas is not on the page');
  }
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 5 });
  await page.mouse.up();
}

const stitches = (page: Page) => page.locator('scc-palette-panel li small');

test('a chart can be created, drawn, saved, found again and exported', async ({ page }) => {
  await register(page);
  await createChart(page, 'Smoke test');

  const saved = page.waitForResponse(
    (response) => response.request().method() === 'PUT' && response.ok(),
  );
  await draw(page);
  await saved;
  await expect(stitches(page)).not.toHaveText('0');
  const drawn = await stitches(page).textContent();

  await page.reload();
  await expect(stitches(page)).toHaveText(drawn ?? '');

  await page.getByRole('link', { name: 'Stitch Chart Creator' }).click();
  await expect(page.getByRole('link', { name: 'Smoke test' })).toBeVisible();

  await page.getByRole('link', { name: 'Smoke test' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PNG' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('smoke-test.png');
  expect(statSync(await download.path()).size).toBeGreaterThan(0);
});

test('anonymous visitors are sent to sign-in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/sign-in/);
});

test('a wrong password right after signing out gives the real message', async ({ page }) => {
  await register(page);
  const name = await page.locator('header nav a').textContent();
  await page.getByRole('button', { name: 'Sign out' }).click();

  await page.getByLabel('Username or e-mail').fill(name ?? '');
  await page.getByLabel('Password').fill('not my password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toHaveText('Invalid username or password');
});
