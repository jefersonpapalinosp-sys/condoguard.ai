import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Dashboard page', () => {
  test('renders dashboard after login', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});

