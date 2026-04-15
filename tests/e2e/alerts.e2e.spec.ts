import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './utils/auth';

const alertsFixture = {
  activeCount: 1,
  items: [
    {
      id: 'alert-critical-1',
      severity: 'critical' as const,
      title: 'Vazamento detectado no Bloco A',
      description: 'Pressao fora do padrao no reservatorio inferior.',
      time: 'agora',
      status: 'active' as const,
      read: false,
      readAt: null,
      readBy: null,
    },
    {
      id: 'alert-info-1',
      severity: 'info' as const,
      title: 'Rotina preventiva concluida',
      description: 'Checklist de bombas finalizado pela equipe.',
      time: 'ha 30 min',
      status: 'read' as const,
      read: true,
      readAt: '2026-04-07T15:00:00Z',
      readBy: 'admin@atlasgrid.ai',
    },
  ],
  meta: {
    page: 1,
    pageSize: 6,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
  filters: {
    severity: null,
    status: null,
    search: null,
  },
  sort: {
    sortBy: 'time',
    sortOrder: 'asc',
  },
};

async function mockAlertsList(page: Page) {
  await page.route(/\/api\/alerts(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(alertsFixture),
    });
  });
}

async function openAlertsPage(page: Page) {
  await loginAsAdmin(page);
  await page.goto('/alerts');
  await expect(page).toHaveURL(/\/alerts/);
  await expect(page.getByRole('heading', { name: 'Central de alertas' })).toBeVisible();
}

test.describe('Alerts page', () => {
  test('renders alerts module', async ({ page }) => {
    await mockAlertsList(page);
    await openAlertsPage(page);
    await expect(page.getByRole('heading', { name: 'Central de alertas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vazamento detectado no Bloco A' })).toBeVisible();
  });

  test('marks an alert as read', async ({ page }) => {
    let markReadCalls = 0;
    await mockAlertsList(page);
    await page.route('**/api/alerts/*/read', async (route) => {
      markReadCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          item: {
            id: 'alert-critical-1',
            status: 'read',
          },
        }),
      });
    });

    await openAlertsPage(page);

    const targetCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Vazamento detectado no Bloco A' }) })
      .first();
    const markAsReadButton = targetCard.getByRole('button', { name: 'Marcar como lido' });
    await expect(markAsReadButton).toBeVisible();
    await markAsReadButton.click();

    await expect.poll(() => markReadCalls).toBe(1);
    await expect(targetCard.getByText('Estado: Lido')).toBeVisible();
    await expect(targetCard.getByRole('button', { name: 'Ja lido' })).toBeVisible();
  });
});
