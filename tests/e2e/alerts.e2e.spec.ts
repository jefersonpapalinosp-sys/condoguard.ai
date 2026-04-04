import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Alerts page', () => {
  test('renders alerts module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Alertas' }).click();
    await expect(page.getByRole('heading', { name: 'Central de alertas' })).toBeVisible();
  });
});

