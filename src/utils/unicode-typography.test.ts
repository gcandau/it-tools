import { describe, expect, it } from 'vitest';
import { normaliseTypography, normaliseWhitespace } from './unicode-typography';

describe('unicode-typography', () => {
  describe('normaliseTypography', () => {
    it('folds curly quotes', () => {
      expect(normaliseTypography('“Hello,” she said. It’s fine.').text)
        .toBe('"Hello," she said. It\'s fine.');
    });

    it('folds dashes but keeps the em dash by default', () => {
      expect(normaliseTypography('1–2 and 3—4').text).toBe('1-2 and 3—4');
    });

    it('converts the em dash when asked', () => {
      expect(normaliseTypography('a—b', { emDash: 'hyphen' }).text).toBe('a-b');
      expect(normaliseTypography('a—b', { emDash: 'double-hyphen' }).text).toBe('a--b');
      expect(normaliseTypography('a—b', { emDash: 'spaced-hyphen' }).text).toBe('a - b');
    });

    it('folds the ellipsis character', () => {
      expect(normaliseTypography('wait…').text).toBe('wait...');
    });

    it('folds exotic spaces to an ordinary space', () => {
      expect(normaliseTypography('a b c d　e').text).toBe('a b c d e');
    });

    it('does not touch ordinary spaces or backticks', () => {
      const input = 'a b `code` c';

      expect(normaliseTypography(input).text).toBe(input);
      expect(normaliseTypography(input).findings).toEqual([]);
    });

    it('folds bullets', () => {
      expect(normaliseTypography('• one').text).toBe('- one');
    });

    it('respects disabled passes', () => {
      const input = '“quoted”';

      expect(normaliseTypography(input, { quotes: false }).text).toBe(input);
    });

    it('reports every substitution with an offset and a category', () => {
      const { findings } = normaliseTypography('a–b');

      expect(findings).toEqual([
        { index: 1, char: '–', replacement: '-', label: 'U+2013', category: 'dash' },
      ]);
    });

    it('leaves plain ASCII untouched', () => {
      const input = 'Plain "ASCII" text - nothing to do...';

      expect(normaliseTypography(input).text).toBe(input);
      expect(normaliseTypography(input).findings).toEqual([]);
    });

    it('is idempotent', () => {
      const once = normaliseTypography('“a” – b…').text;

      expect(normaliseTypography(once).text).toBe(once);
    });
  });

  describe('normaliseWhitespace', () => {
    it('normalises line endings', () => {
      expect(normaliseWhitespace('a\r\nb\rc')).toBe('a\nb\nc');
    });

    it('collapses repeated spaces', () => {
      expect(normaliseWhitespace('a    b')).toBe('a b');
    });

    it('trims line ends', () => {
      expect(normaliseWhitespace('a   \nb\t\n')).toBe('a\nb\n');
    });

    it('collapses runs of blank lines', () => {
      expect(normaliseWhitespace('a\n\n\n\n\nb')).toBe('a\n\nb');
    });

    it('respects disabled passes', () => {
      expect(normaliseWhitespace('a    b', { collapseSpaces: false })).toBe('a    b');
    });

    it('trims the whole text only when asked', () => {
      // Trailing spaces already go with the line-end pass; leading ones survive without `trim`.
      expect(normaliseWhitespace('  a  ')).toBe(' a');
      expect(normaliseWhitespace('  a  ', { trim: true })).toBe('a');
    });
  });
});
