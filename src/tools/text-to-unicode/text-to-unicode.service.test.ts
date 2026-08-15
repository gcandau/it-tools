import { describe, expect, it } from 'vitest';
import { convertTextToUnicode, convertUnicodeToText } from './text-to-unicode.service';

describe('text-to-unicode', () => {
  describe('convertTextToUnicode', () => {
    it('converts ASCII text to decimal entities', () => {
      expect(convertTextToUnicode('AB')).toBe('&#65;&#66;');
      expect(convertTextToUnicode('')).toBe('');
    });

    it('converts characters outside the Basic Multilingual Plane as a single code point', () => {
      // U+1F600, not the two surrogate halves 0xD83D and 0xDE00.
      expect(convertTextToUnicode('😀')).toBe('&#128512;');
    });

    it('handles mixed scripts', () => {
      expect(convertTextToUnicode('a✓')).toBe('&#97;&#10003;');
    });
  });

  describe('convertUnicodeToText', () => {
    it('decodes decimal entities', () => {
      expect(convertUnicodeToText('&#65;&#66;')).toBe('AB');
    });

    it('decodes code points above the Basic Multilingual Plane', () => {
      expect(convertUnicodeToText('&#128512;')).toBe('😀');
    });

    it('leaves text without entities untouched', () => {
      expect(convertUnicodeToText('plain text')).toBe('plain text');
    });
  });

  it('round-trips every script', () => {
    for (const text of ['hello', 'héllo', 'Привет', '日本語', '😀🎉', '👨‍👩‍👧']) {
      expect(convertUnicodeToText(convertTextToUnicode(text))).toBe(text);
    }
  });
});
