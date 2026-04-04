import { expect, type Page } from '@playwright/test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/');

  const emailField = page.getByLabel('E-mail');
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill('admin@condoguard.ai');
    await page.getByLabel('Senha').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
  } else {
    // Compatibilidade com fluxo sem redirecionamento obrigatorio para /login.
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('admin@condoguard.ai');
    await page.getByLabel('Senha').fill('password123');
    await page.getByRole('button', { name: /Entrar/i }).click();
  }

  await expect(page).toHaveURL(/\/dashboard/);
}
