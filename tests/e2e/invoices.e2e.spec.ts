import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

test.describe('Invoices page', () => {
  test('renders invoices module', async ({ page }) => {
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Faturas' }).click();
    await expect(page.locator('main section').first().getByRole('heading', { name: 'Faturas', exact: true })).toBeVisible();
  });

  test('shows fallback toast and badge when invoices API is unavailable', async ({ page }) => {
    await page.route('**/api/invoices*', (route) => route.abort());
    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Faturas' }).click();

    await expect(page.getByText('Aviso de conectividade')).toBeVisible();
    await expect(page.getByText(/Faturas: API indisponivel/i)).toBeVisible();
    await expect(page.getByText('Fonte: fallback mock')).toBeVisible();
  });

  test('exports invoices CSV with current filters', async ({ page }) => {
    await page.addInitScript(() => {
      (window as Window & { __csvBlobExports?: number }).__csvBlobExports = 0;
      const originalCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = ((obj: Blob | MediaSource) => {
        (window as Window & { __csvBlobExports?: number }).__csvBlobExports =
          ((window as Window & { __csvBlobExports?: number }).__csvBlobExports || 0) + 1;
        return originalCreateObjectURL(obj);
      }) as typeof URL.createObjectURL;
    });

    await loginAsAdmin(page);
    await page.getByRole('link', { name: 'Faturas' }).click();

    const exportButton = page.getByRole('button', { name: 'Exportar CSV' });
    await exportButton.click();

    await expect.poll(async () => page.evaluate(() => (window as Window & { __csvBlobExports?: number }).__csvBlobExports || 0)).toBeGreaterThan(0);
    await expect(page.getByText('Falha ao exportar CSV de faturas.')).not.toBeVisible();
  });
});
