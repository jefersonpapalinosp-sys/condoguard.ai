import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Alerts page', () => {
  test('renders alerts module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Alertas' }).click();
    await expect(page.getByRole('heading', { name: 'Central de alertas' })).toBeVisible();
  });

  test('marks an alert as read', async ({ page }) => {
    await page.route('**/api/alerts/*/read', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ item: {} }),
      });
    });

    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Alertas' }).click();
    await expect(page.getByRole('heading', { name: 'Central de alertas' })).toBeVisible();

    const firstCard = page.locator('article').first();
    await expect(firstCard.getByRole('button', { name: 'Marcar como lido' })).toBeVisible();
    await firstCard.getByRole('button', { name: 'Marcar como lido' }).click();

    await expect(firstCard.getByText('Estado: Lido')).toBeVisible();
  });
});
