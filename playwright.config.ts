import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'set VITE_API_BASE_URL=http://127.0.0.1:4000&& npm.cmd run build && npm.cmd run preview -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 240000,
    },
    {
      command: 'set PORT=4000&& set APP_ENV=dev&& set AUTH_PROVIDER=local_jwt&& set AUTH_PASSWORD_LOGIN_ENABLED=true&& set ENABLE_DEMO_AUTH=true&& set CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173,http://localhost:4173&& npm.cmd run api:dev:mock',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
