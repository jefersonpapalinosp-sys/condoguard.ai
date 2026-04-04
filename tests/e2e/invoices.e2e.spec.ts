import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Invoices page', () => {
  test('renders invoices module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Faturas' }).click();
    await expect(page.getByRole('heading', { name: 'Faturas' })).toBeVisible();
  });

  test('shows fallback toast and badge when invoices API is unavailable', async ({ page }) => {
    await page.route('**/api/invoices', (route) => route.abort());
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Faturas' }).click();

    await expect(page.getByText('Aviso de conectividade')).toBeVisible();
    await expect(page.getByText(/Faturas: API indisponivel/i)).toBeVisible();
    await expect(page.getByText('Fonte: fallback mock')).toBeVisible();
  });
});

