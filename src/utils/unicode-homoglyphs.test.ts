import { describe, expect, it } from 'vitest';
import { detectHomoglyphs, normaliseHomoglyphs, normaliseStyledLatin } from './unicode-homoglyphs';

describe('unicode-homoglyphs', () => {
  describe('detectHomoglyphs', () => {
    it('finds Cyrillic letters hiding in a Latin word', () => {
      // "раypal" — the first two letters are Cyrillic er and a.
      const findings = detectHomoglyphs('please log in at раypal.com');

      expect(findings).toHaveLength(2);
      expect(findings[0]).toMatchObject({ char: 'р', replacement: 'p', label: 'U+0440', word: 'раypal' });
      expect(findings[1]).toMatchObject({ char: 'а', replacement: 'a', label: 'U+0430' });
    });

    it('leaves genuine non-Latin text alone', () => {
      expect(detectHomoglyphs('Привет, как дела?')).toEqual([]);
      expect(detectHomoglyphs('Καλημέρα κόσμε')).toEqual([]);
    });

    it('reports nothing for plain ASCII', () => {
      expect(detectHomoglyphs('paypal.com')).toEqual([]);
    });

    it('reports the offset in the original string', () => {
      const findings = detectHomoglyphs('abc dеf');

      expect(findings[0].index).toBe(5);
    });
  });

  describe('normaliseHomoglyphs', () => {
    it('rewrites a spoofed domain', () => {
      expect(normaliseHomoglyphs('раypal.com').text).toBe('paypal.com');
    });

    it('does not touch a wholly Cyrillic word', () => {
      const input = 'Привет мир';

      expect(normaliseHomoglyphs(input).text).toBe(input);
    });

    it('handles mixed content in one pass', () => {
      const { text, findings } = normaliseHomoglyphs('Привет, visit аpple.com');

      expect(text).toBe('Привет, visit apple.com');
      expect(findings).toHaveLength(1);
    });

    it('is idempotent', () => {
      const once = normaliseHomoglyphs('раypal').text;

      expect(normaliseHomoglyphs(once).text).toBe(once);
    });
  });

  describe('normaliseStyledLatin', () => {
    it('folds mathematical alphanumerics', () => {
      expect(normaliseStyledLatin('𝐇𝐞𝐥𝐥𝐨').text).toBe('Hello');
      expect(normaliseStyledLatin('𝕳𝖊𝖑𝖑𝖔').text).toBe('Hello');
      expect(normaliseStyledLatin('𝟏𝟐𝟑').text).toBe('123');
    });

    it('folds fullwidth forms', () => {
      expect(normaliseStyledLatin('Ｈｅｌｌｏ　１２３').text).toBe('Hello　123');
    });

    it('folds the letterlike symbols used as math italic holes', () => {
      expect(normaliseStyledLatin('ℋℯ').text).toBe('He');
    });

    it('leaves symbols whose decomposition is not a single ASCII character', () => {
      const input = '25℃ ™ Ω ½';

      expect(normaliseStyledLatin(input).text).toBe(input);
    });

    it('leaves ordinary text untouched', () => {
      const input = 'Hello world 123';

      expect(normaliseStyledLatin(input).text).toBe(input);
      expect(normaliseStyledLatin(input).findings).toEqual([]);
    });

    it('reports what it changed', () => {
      const { findings } = normaliseStyledLatin('𝐀b');

      expect(findings).toEqual([{ index: 0, char: '𝐀', replacement: 'A', label: 'U+1D400' }]);
    });
  });
});
