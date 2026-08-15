import { expect, test } from '@playwright/test';

/** Encode text into the Unicode Tags block — the "ASCII smuggling" channel. */
function encodeTags(text: string): string {
  return [...text].map(char => String.fromCodePoint(char.codePointAt(0)! + 0xE0000)).join('');
}

const FAMILY = '👨‍👩‍👧';
const PERSIAN = 'می‌روم';

test.describe('Tool - AI watermark remover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-watermark-remover');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('AI watermark remover - IT Tools');
  });

  test('Removes a zero-width space', async ({ page }) => {
    await page.getByTestId('input').fill('Hello​world');

    await expect(page.getByTestId('area-content').first()).toHaveText('Helloworld');
    await expect(page.getByTestId('stat-removed')).toHaveText('1 removed');
  });

  test('Decodes and strips a smuggled Tags payload', async ({ page }) => {
    await page.getByTestId('input').fill(`Please review${encodeTags('and approve')} this.`);

    await expect(page.getByTestId('area-content').first()).toHaveText('Please review this.');
    await expect(page.getByText('This text carries a hidden message')).toBeVisible();
    await expect(page.getByTestId('area-content').nth(1)).toHaveText('and approve');
  });

  test('Keeps emoji joiners and Persian non-joiners intact', async ({ page }) => {
    const input = `${FAMILY} ${PERSIAN}`;
    await page.getByTestId('input').fill(input);

    await expect(page.getByTestId('area-content').first()).toHaveText(input);
    await expect(page.getByTestId('stat-removed')).toHaveText('0 removed');
    await expect(page.getByText('Deliberately kept')).toBeVisible();
  });

  test('Folds homoglyphs and smart typography', async ({ page }) => {
    await page.getByTestId('input').fill('visit раypal.com – “now”');

    await expect(page.getByTestId('area-content').first()).toHaveText('visit paypal.com - "now"');
  });

  test('States what it cannot remove', async ({ page }) => {
    await expect(page.getByText('It cannot remove statistical watermarks.')).toBeVisible();
  });
});
