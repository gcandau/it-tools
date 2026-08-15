import { describe, expect, it } from 'vitest';
import { MINIMUM_WORD_COUNT, detectAiText } from './ai-text-detector.service';

function encodeTags(text: string): string {
  return [...text].map(char => String.fromCodePoint(char.codePointAt(0)! + 0xE0000)).join('');
}

/** Varied, contraction-heavy prose of a given word count — the "human-looking" end of every ramp. */
function buildBurstyText(sentences = 40): string {
  const shapes = [
    'I don\'t buy it.',
    'Maybe.',
    'When the pipeline finally shipped last spring, after four rewrites and a weekend nobody wants to talk about, the numbers barely moved and everybody pretended otherwise.',
    'We tried again.',
    'It broke, loudly, in front of the customer, which is the only kind of breaking that teaches you anything at all about your own assumptions.',
    'Fine.',
  ];

  return Array.from({ length: sentences }, (_, index) => shapes[index % shapes.length]).join(' ');
}

/** Uniform, slop-heavy prose — the "machine-looking" end. */
function buildUniformText(sentences = 40): string {
  const shapes = [
    'This development underscores the importance of a robust and multifaceted approach to the problem.',
    'Furthermore, the evolving landscape continues to delve into the intricate details of the system.',
    'Moreover, the framework showcases a meticulous commitment to seamless and scalable integration.',
    'Additionally, the solution plays a pivotal role in navigating the complexities of modern data.',
  ];

  return Array.from({ length: sentences }, (_, index) => shapes[index % shapes.length]).join(' ');
}

describe('ai-text-detector', () => {
  describe('hard evidence', () => {
    it('reports a decoded hidden payload as conclusive', () => {
      const result = detectAiText(`A normal sentence${encodeTags('secret instruction')}.`);

      expect(result.verdict.band).toBe('strong');
      expect(result.hardEvidence.map(signal => signal.id)).toContain('hidden-payload');
      expect(result.hardEvidence.find(signal => signal.id === 'hidden-payload')?.evidence[0])
        .toContain('secret instruction');
    });

    it('reports chat interface copy-paste residue', () => {
      const result = detectAiText('As shown in the report :contentReference[oaicite:3]{index=3} the trend holds.');

      const signal = result.hardEvidence.find(item => item.id === 'vendor-artifacts');

      expect(signal?.reliability).toBe('high');
      expect(result.verdict.band).toBe('strong');
    });

    it('recognises a Gemini citation marker', () => {
      const result = detectAiText('The figure rose sharply [cite: 12] over the period.');

      expect(result.hardEvidence.map(signal => signal.id)).toContain('vendor-artifacts');
    });

    it('grades a long zero-width run higher than an isolated one', () => {
      const dense = detectAiText(`a${'​'.repeat(10)}b`);
      const sparse = detectAiText('a​b');

      expect(dense.hardEvidence.find(signal => signal.id === 'zero-width-characters')?.reliability).toBe('high');
      expect(sparse.hardEvidence.find(signal => signal.id === 'zero-width-characters')?.reliability).toBe('medium');
    });

    it('reports homoglyphs as tampering rather than authorship', () => {
      const signal = detectAiText('log in at раypal.com').hardEvidence
        .find(item => item.id === 'homoglyphs');

      expect(signal?.reliability).toBe('medium');
      expect(signal?.detail).toContain('not of AI authorship');
    });

    it('finds nothing in clean text', () => {
      expect(detectAiText('A perfectly ordinary sentence.').hardEvidence).toEqual([]);
    });

    it('does not flag legitimate emoji or Persian', () => {
      expect(detectAiText('Family 👨‍👩‍👧 and می‌روم').hardEvidence).toEqual([]);
    });
  });

  describe('word-count floor', () => {
    it('refuses to score text below the floor', () => {
      const result = detectAiText('Short text that says very little at all.');

      expect(result.scorable).toBe(false);
      expect(result.verdict.band).toBe('insufficient');
      expect(result.verdict.summary).toContain(String(MINIMUM_WORD_COUNT));
    });

    it('still reports hidden characters below the floor', () => {
      const result = detectAiText(`Short${encodeTags('hi')}.`);

      expect(result.scorable).toBe(false);
      expect(result.verdict.band).toBe('strong');
      expect(result.hardEvidence.length).toBeGreaterThan(0);
    });

    it('scores once the floor is reached', () => {
      const result = detectAiText(buildUniformText(60));

      expect(result.wordCount).toBeGreaterThanOrEqual(MINIMUM_WORD_COUNT);
      expect(result.scorable).toBe(true);
      expect(result.verdict.band).not.toBe('insufficient');
    });
  });

  describe('stylometry', () => {
    it('scores uniform slop-heavy prose above varied human-looking prose', () => {
      const uniform = detectAiText(buildUniformText(60));
      const bursty = detectAiText(buildBurstyText(80));

      const total = (result: ReturnType<typeof detectAiText>) =>
        result.stylometry.reduce((sum, signal) => sum + signal.score, 0);

      expect(total(uniform)).toBeGreaterThan(total(bursty));
    });

    it('produces a stronger band for uniform prose', () => {
      const uniform = detectAiText(buildUniformText(60)).verdict.band;
      const bursty = detectAiText(buildBurstyText(80)).verdict.band;

      const order = ['none', 'weak', 'moderate', 'strong'];

      expect(order.indexOf(uniform)).toBeGreaterThan(order.indexOf(bursty));
    });

    it('grades every stylometric signal as low or medium at best', () => {
      const result = detectAiText(buildUniformText(60));

      expect(result.stylometry.every(signal => signal.reliability !== 'high')).toBe(true);
    });

    it('keeps every score within [0, 1]', () => {
      for (const text of [buildUniformText(60), buildBurstyText(80), 'x'.repeat(10)]) {
        const result = detectAiText(text);

        for (const signal of [...result.stylometry, ...result.hardEvidence]) {
          expect(signal.score).toBeGreaterThanOrEqual(0);
          expect(signal.score).toBeLessThanOrEqual(1);
        }
      }
    });

    it('grades the punctuation profile as very low reliability', () => {
      const signal = detectAiText(buildUniformText(60)).stylometry
        .find(item => item.id === 'punctuation-profile');

      expect(signal?.reliability).toBe('very-low');
    });
  });

  describe('language gating', () => {
    it('applies the English phrase lists to English', () => {
      const result = detectAiText(buildUniformText(60));

      expect(result.isEnglish).toBe(true);
      expect(result.stylometry.map(signal => signal.id)).toContain('ai-lexicon');
    });

    it('skips them for other languages', () => {
      const french = Array.from({ length: 60 }, () =>
        'Le renard brun rapide saute par-dessus le chien paresseux puis retourne vers la maison.').join(' ');
      const result = detectAiText(french);

      expect(result.isEnglish).toBe(false);
      expect(result.stylometry.map(signal => signal.id)).not.toContain('ai-lexicon');
    });
  });

  describe('robustness', () => {
    it('handles empty input', () => {
      const result = detectAiText('');

      expect(result.wordCount).toBe(0);
      expect(result.verdict.band).toBe('insufficient');
      expect(result.hardEvidence).toEqual([]);
    });

    it('handles whitespace-only input', () => {
      expect(detectAiText('   \n\n  ').wordCount).toBe(0);
    });

    it('never claims proof of authorship in a verdict', () => {
      for (const text of [buildUniformText(60), `x${encodeTags('y')}`]) {
        expect(detectAiText(text).verdict.summary).toMatch(/not|does not/i);
      }
    });
  });
});
