import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Auth flow', () => {
  test('logs in and navigates to dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: /Condominio Mirante do Parque/i })).toBeVisible();
  });
});

