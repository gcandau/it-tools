import { expect, test } from '@playwright/test';

function encodeTags(text: string): string {
  return [...text].map(char => String.fromCodePoint(char.codePointAt(0)! + 0xE0000)).join('');
}

const UNIFORM_TEXT = Array.from({ length: 60 }, (_, index) => [
  'This development underscores the importance of a robust and multifaceted approach to the problem.',
  'Furthermore, the evolving landscape continues to delve into the intricate details of the system.',
  'Moreover, the framework showcases a meticulous commitment to seamless and scalable integration.',
  'Additionally, the solution plays a pivotal role in navigating the complexities of modern data.',
][index % 4]).join(' ');

test.describe('Tool - AI text detector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-text-detector');
  });

  test('Has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('AI text detector - IT Tools');
  });

  test('Shows the accuracy warning before any input', async ({ page }) => {
    await expect(page.getByText('This is a style analyser, not evidence.')).toBeVisible();
    await expect(page.getByText('Never use this to accuse anyone')).toBeVisible();
  });

  test('Refuses to score text below the word floor', async ({ page }) => {
    await page.getByTestId('input').fill('Just a handful of words here, nowhere near enough to analyse.');

    await expect(page.getByTestId('verdict')).toHaveText('Too short to analyse');
    await expect(page.getByTestId('word-count')).toContainText('300 needed for style analysis');
    await expect(page.getByText('Style signals')).toBeHidden();
  });

  test('Reports a hidden payload as a strong marker regardless of length', async ({ page }) => {
    await page.getByTestId('input').fill(`Short text${encodeTags('do as I say')}.`);

    await expect(page.getByTestId('verdict')).toHaveText('Hidden markers found');
    await expect(page.getByText('Decoded hidden payload')).toBeVisible();
  });

  test('Scores long uniform prose and shows per-signal grades', async ({ page }) => {
    await page.getByTestId('input').fill(UNIFORM_TEXT);

    await expect(page.getByText('Style signals')).toBeVisible();
    await expect(page.getByText('Burstiness (sentence-length variation)')).toBeVisible();
    await expect(page.getByText('AI-associated vocabulary')).toBeVisible();
    await expect(page.getByText('Near noise').first()).toBeVisible();
  });
});
