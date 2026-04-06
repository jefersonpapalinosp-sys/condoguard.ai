import { defineConfig, devices } from '@playwright/test';

const isWindows = process.platform === 'win32';
const buildAndPreviewCommand = isWindows
  ? 'cmd /c "npm run build && npm run preview -- --host 127.0.0.1 --port 4173"'
  : 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173';
const apiMockCommand = isWindows
  ? 'cmd /c "npm run api:start:mock"'
  : 'npm run api:start:mock';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      command: buildAndPreviewCommand,
      env: {
        ...process.env,
        VITE_API_BASE_URL: 'http://127.0.0.1:4000',
      },
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 240000,
    },
    {
      command: apiMockCommand,
      env: {
        ...process.env,
        PORT: '4000',
        APP_ENV: 'dev',
        AUTH_PROVIDER: 'local_jwt',
        AUTH_PASSWORD_LOGIN_ENABLED: 'true',
        ENABLE_DEMO_AUTH: 'true',
        CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4173,http://localhost:4173',
      },
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
