import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/pages.e2e.ts',
  outputDir: 'test-results/pages',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: process.env.PAGES_TEST_URL || 'http://127.0.0.1:4173/MachinePlayground/',
    viewport: { width: 1440, height: 1100 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    } : undefined,
  },
  webServer: process.env.PAGES_TEST_URL ? undefined : {
    command: 'npm run preview:pages',
    url: 'http://127.0.0.1:4173/MachinePlayground/',
    reuseExistingServer: false,
  },
});
