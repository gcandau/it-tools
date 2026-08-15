import { describe, expect, it } from 'vitest';
import {
  findLexiconHits,
  getBurstiness,
  getDistinctNgramRatio,
  getFunctionWordShare,
  getHapaxRatio,
  getMattr,
  getMtld,
  getPunctuationProfile,
  looksLikeEnglish,
  splitSentences,
  splitWords,
} from './ai-text-detector.metrics';

describe('ai-text-detector metrics', () => {
  describe('splitSentences', () => {
    it('splits on sentence boundaries', () => {
      expect(splitSentences('One. Two! Three?')).toHaveLength(3);
    });

    // Documents a known limitation rather than asserting a fix: ICU sentence segmentation breaks
    // after an abbreviation, which slightly inflates the sentence count and therefore lowers the
    // measured mean sentence length. It is one more reason burstiness is graded "low".
    it('breaks after an abbreviation', () => {
      expect(splitSentences('Dr. Smith arrived.')).toHaveLength(2);
    });

    it('returns nothing for empty input', () => {
      expect(splitSentences('   ')).toEqual([]);
    });
  });

  describe('splitWords', () => {
    it('lowercases and drops punctuation', () => {
      expect(splitWords('Hello, World!')).toEqual(['hello', 'world']);
    });

    it('returns nothing for punctuation only', () => {
      expect(splitWords('... !!!')).toEqual([]);
    });
  });

  describe('getBurstiness', () => {
    it('is zero when every sentence is the same length', () => {
      const result = getBurstiness([10, 10, 10, 10]);

      expect(result.coefficientOfVariation).toBe(0);
      expect(result.meanSentenceLength).toBe(10);
      expect(result.clusteredShare).toBe(1);
    });

    it('rises with variation', () => {
      const result = getBurstiness([5, 15]);

      expect(result.coefficientOfVariation).toBeCloseTo(0.707, 2);
      expect(result.clusteredShare).toBe(0);
    });

    it('reports the bounded variant within [-1, 1]', () => {
      const result = getBurstiness([2, 40, 7, 19]);

      expect(result.bounded).toBeGreaterThanOrEqual(-1);
      expect(result.bounded).toBeLessThanOrEqual(1);
    });

    it('handles an empty list', () => {
      expect(getBurstiness([])).toMatchObject({ coefficientOfVariation: 0, clusteredShare: 0 });
    });
  });

  describe('getMtld', () => {
    it('is higher for varied vocabulary than for repetitive text', () => {
      const varied = Array.from({ length: 200 }, (_, index) => `word${index}`);
      const repetitive = Array.from({ length: 200 }, (_, index) => `word${index % 8}`);

      expect(getMtld(varied)).toBeGreaterThan(getMtld(repetitive));
    });

    it('is roughly stable as length grows, unlike raw TTR', () => {
      const build = (length: number) => Array.from({ length }, (_, index) => `w${index % 60}`);
      const short = getMtld(build(300));
      const long = getMtld(build(900));

      expect(Math.abs(short - long) / short).toBeLessThan(0.35);
    });

    it('returns zero for no words', () => {
      expect(getMtld([])).toBe(0);
    });
  });

  describe('getMattr / getHapaxRatio', () => {
    it('reports full diversity for all-distinct words', () => {
      const words = Array.from({ length: 100 }, (_, index) => `w${index}`);

      expect(getMattr(words)).toBe(1);
      expect(getHapaxRatio(words)).toBe(1);
    });

    it('falls with repetition', () => {
      expect(getHapaxRatio(['a', 'a', 'b'])).toBeCloseTo(0.5, 5);
    });
  });

  describe('getDistinctNgramRatio', () => {
    it('counts repeated n-grams', () => {
      expect(getDistinctNgramRatio(['a', 'b', 'a', 'b'], 2)).toBeCloseTo(2 / 3, 5);
    });

    it('returns 1 when the text is shorter than the window', () => {
      expect(getDistinctNgramRatio(['a'], 4)).toBe(1);
    });
  });

  describe('getFunctionWordShare / looksLikeEnglish', () => {
    it('measures the share of function words', () => {
      expect(getFunctionWordShare(['the', 'cat', 'is', 'here'])).toBeCloseTo(0.75, 5);
    });

    it('recognises English prose', () => {
      const english = splitWords(
        'The quick brown fox jumps over the lazy dog, and then it runs back to the house where '
        + 'the other animals are waiting for him to return with the food that he has found.',
      );

      expect(looksLikeEnglish(english)).toBe(true);
    });

    it('does not claim French is English', () => {
      const french = splitWords(
        'Le renard brun rapide saute par-dessus le chien paresseux puis retourne vers la maison où '
        + 'les autres animaux attendent qu il revienne avec la nourriture qu il a trouvée hier.',
      );

      expect(looksLikeEnglish(french)).toBe(false);
    });

    it('refuses to judge very short input', () => {
      expect(looksLikeEnglish(['the', 'cat'])).toBe(false);
    });
  });

  describe('getPunctuationProfile', () => {
    it('counts per 1000 words', () => {
      const profile = getPunctuationProfile('a — b — c', 1000);

      expect(profile.emDashPer1000).toBe(2);
    });

    it('counts contractions and curly quotes', () => {
      const profile = getPunctuationProfile('It’s fine, “really” — don\'t worry.', 100);

      // Three curly characters: the apostrophe in "It’s" plus the two double quotes.
      expect(profile.curlyQuoteCount).toBe(3);
      expect(profile.contractionsPer1000).toBe(20);
    });

    it('counts wrap-up phrases', () => {
      expect(getPunctuationProfile('In conclusion, it works. Overall, good.', 100).closerCount).toBe(2);
    });
  });

  describe('findLexiconHits', () => {
    it('finds AI-associated vocabulary', () => {
      const hits = findLexiconHits('Let us delve into this rich tapestry, which is a testament to progress.');

      expect(hits.map(hit => hit.term)).toEqual(
        expect.arrayContaining(['delve', 'rich tapestry', 'is a testament to']),
      );
    });

    it('does not match inside longer words', () => {
      expect(findLexiconHits('The delved earth').some(hit => hit.term === 'delve')).toBe(false);
    });

    it('returns nothing for ordinary prose', () => {
      expect(findLexiconHits('The cat sat on the mat and went to sleep.')).toEqual([]);
    });

    it('is case insensitive', () => {
      expect(findLexiconHits('MOREOVER, it works.').some(hit => hit.term === 'moreover')).toBe(true);
    });
  });
});
