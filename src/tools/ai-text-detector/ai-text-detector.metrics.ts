/**
 * Text statistics used by the AI text detector.
 *
 * Everything here is a surface measurement of style. None of it observes the model that produced
 * the text, so none of it is evidence of authorship on its own — see the tool's disclaimer.
 */

/** Minimum length below which every statistic in this file is noise. */
export const MINIMUM_WORD_COUNT = 300;

const SEGMENTER_LOCALE = 'en';

// `Intl.Segmenter` is available in every browser this app targets, but its types are not reachable
// under the project's TypeScript lib configuration, so it is accessed through a local shape and a
// regex fallback is kept for any runtime that lacks it.
interface SegmentLike { segment: string; isWordLike?: boolean }
interface SegmenterLike { segment: (input: string) => Iterable<SegmentLike> }
type SegmenterConstructor = new (
  locale: string,
  options: { granularity: 'sentence' | 'word' | 'grapheme' },
) => SegmenterLike;

function getSegmenter(granularity: 'sentence' | 'word'): SegmenterLike | undefined {
  const constructor = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;

  return constructor ? new constructor(SEGMENTER_LOCALE, { granularity }) : undefined;
}

export function splitSentences(text: string): string[] {
  const segmenter = getSegmenter('sentence');

  if (segmenter) {
    return [...segmenter.segment(text)]
      .map(segment => segment.segment.trim())
      .filter(sentence => sentence.length > 0);
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);
}

export function splitWords(text: string): string[] {
  const segmenter = getSegmenter('word');

  if (segmenter) {
    return [...segmenter.segment(text)]
      .filter(segment => segment.isWordLike)
      .map(segment => segment.segment.toLowerCase());
  }

  return (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []);
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const average = mean(values);
  const variance = values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);

  return Math.sqrt(variance);
}

export interface BurstinessResult {
  /** Coefficient of variation of sentence lengths: σ / μ. */
  coefficientOfVariation: number
  /** Goh & Barabási's bounded variant: (σ − μ) / (σ + μ), in [−1, 1]. */
  bounded: number
  meanSentenceLength: number
  standardDeviation: number
  /** Share of sentences within ±20% of the mean — LLM prose clusters hard. */
  clusteredShare: number
}

export function getBurstiness(sentenceLengths: number[]): BurstinessResult {
  const average = mean(sentenceLengths);
  const deviation = standardDeviation(sentenceLengths);

  const clustered = sentenceLengths.filter(
    length => average > 0 && Math.abs(length - average) <= average * 0.2,
  ).length;

  return {
    coefficientOfVariation: average === 0 ? 0 : deviation / average,
    bounded: deviation + average === 0 ? 0 : (deviation - average) / (deviation + average),
    meanSentenceLength: average,
    standardDeviation: deviation,
    clusteredShare: sentenceLengths.length === 0 ? 0 : clustered / sentenceLengths.length,
  };
}

const MTLD_THRESHOLD = 0.72;

function mtldPass(words: string[]): number {
  let factors = 0;
  let types = new Set<string>();
  let tokens = 0;

  for (const word of words) {
    tokens++;
    types.add(word);

    if (types.size / tokens <= MTLD_THRESHOLD) {
      factors++;
      types = new Set();
      tokens = 0;
    }
  }

  if (tokens > 0) {
    const remainder = types.size / tokens;
    factors += (1 - remainder) / (1 - MTLD_THRESHOLD);
  }

  return factors === 0 ? words.length : words.length / factors;
}

/**
 * Measure of Textual Lexical Diversity — the standard length-independent richness measure.
 * Raw type-token ratio is deliberately not used: it falls monotonically with length, so it
 * measures document length rather than vocabulary.
 */
export function getMtld(words: string[]): number {
  if (words.length === 0) {
    return 0;
  }

  return (mtldPass(words) + mtldPass([...words].reverse())) / 2;
}

/** Moving-average type-token ratio over a sliding window. */
export function getMattr(words: string[], window = 50): number {
  if (words.length <= window) {
    return words.length === 0 ? 0 : new Set(words).size / words.length;
  }

  let total = 0;
  for (let start = 0; start + window <= words.length; start++) {
    total += new Set(words.slice(start, start + window)).size / window;
  }

  return total / (words.length - window + 1);
}

export function getHapaxRatio(words: string[]): number {
  if (words.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const hapax = [...counts.values()].filter(count => count === 1).length;

  return hapax / counts.size;
}

/** Proportion of distinct n-grams — lower means more templated repetition. */
export function getDistinctNgramRatio(words: string[], size: number): number {
  if (words.length < size) {
    return 1;
  }

  const ngrams: string[] = [];
  for (let index = 0; index + size <= words.length; index++) {
    ngrams.push(words.slice(index, index + size).join(' '));
  }

  return new Set(ngrams).size / ngrams.length;
}

/**
 * The classical stylometric signal (Mosteller & Wallace; Burrows's Delta). Function-word usage is
 * largely unconscious, which makes its distribution one of the more discriminating features
 * available without a language model.
 */
export const FUNCTION_WORDS = [
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as',
  'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had',
  'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my',
  'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our',
  'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
  'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your',
  'yours', 'yourself', 'yourselves',
];

export function getFunctionWordShare(words: string[]): number {
  if (words.length === 0) {
    return 0;
  }

  const functionWords = new Set(FUNCTION_WORDS);

  return words.filter(word => functionWords.has(word)).length / words.length;
}

export interface PunctuationProfile {
  emDashPer1000: number
  enDashPer1000: number
  semicolonPer1000: number
  exclamationPer1000: number
  curlyQuoteCount: number
  contractionsPer1000: number
  /** Sentences ending in a wrap-up phrase such as "In conclusion". */
  closerCount: number
}

// The second alternative is split out because a `\b` after a comma can never match.
const CLOSERS = /\b(?:in conclusion|in summary|to summari[sz]e|all in all)\b|\b(?:overall|ultimately)\s*,/gi;
const CONTRACTIONS = /\b\w+['’](?:s|t|re|ve|ll|d|m)\b/gi;

export function getPunctuationProfile(text: string, wordCount: number): PunctuationProfile {
  const per1000 = (count: number) => (wordCount === 0 ? 0 : (count / wordCount) * 1000);
  const countOf = (pattern: RegExp) => (text.match(pattern) ?? []).length;

  return {
    emDashPer1000: per1000(countOf(/—/g)),
    enDashPer1000: per1000(countOf(/–/g)),
    semicolonPer1000: per1000(countOf(/;/g)),
    exclamationPer1000: per1000(countOf(/!/g)),
    curlyQuoteCount: countOf(/[“”‘’]/g),
    contractionsPer1000: per1000(countOf(CONTRACTIONS)),
    closerCount: countOf(CLOSERS),
  };
}

/**
 * Syntactic constructions that LLM prose over-produces. These are regex-able with decent precision,
 * unlike most style signals.
 */
export const STRUCTURAL_PATTERNS: { id: string; label: string; pattern: RegExp }[] = [
  {
    id: 'negative-parallelism',
    label: 'Negative parallelism ("not just X, but Y")',
    pattern: /\bnot (?:just|only|merely|simply)\b[^.!?]{0,80}\b(?:but|it'?s|they'?re)\b/gi,
  },
  {
    id: 'not-x-its-y',
    label: '"It\'s not X, it\'s Y"',
    pattern: /\bit'?s not\b[^.!?]{0,60},\s*it'?s\b/gi,
  },
  {
    id: 'rule-of-three',
    label: 'Rule-of-three lists',
    pattern: /\b\w+,\s+\w+,\s+and\s+\w+\b/g,
  },
  {
    id: 'superficial-participle',
    label: 'Participial wrap-up clauses ("highlighting the importance of…")',
    pattern: /,\s+(?:highlighting|underscoring|emphasi[sz]ing|reflecting|symboli[sz]ing|showcasing|ensuring|cultivating|fostering)\b/gi,
  },
  {
    id: 'vague-attribution',
    label: 'Vague attribution ("experts argue", "studies show")',
    pattern: /\b(?:industry reports|observers have (?:cited|noted)|experts (?:argue|say|suggest)|studies show|research (?:shows|suggests)|some critics argue|several sources)\b/gi,
  },
];

/**
 * Vocabulary that LLM-assisted writing over-produces, in weighted buckets. Sourced from Wikipedia's
 * "Signs of AI writing" (CC BY-SA) and quantified by Kobak et al., Science Advances 2025, which
 * measured excess-frequency ratios across 15M PubMed abstracts — `delves` ×28.0, `underscores`
 * ×13.8, `showcasing` ×10.7.
 *
 * English only. The detector disables this signal when the text does not look like English,
 * because a phrase list in one language is worse than useless in another.
 */
export const AI_LEXICON: { id: string; label: string; weight: number; terms: string[] }[] = [
  {
    id: 'high-density',
    label: 'High-density AI vocabulary',
    weight: 1.5,
    terms: [
      'delve', 'delves', 'delving', 'tapestry', 'testament', 'underscore', 'underscores',
      'underscoring', 'intricate', 'intricacies', 'pivotal', 'robust', 'showcase', 'showcases',
      'showcasing', 'meticulous', 'meticulously', 'interplay', 'garner', 'garnered', 'bolstered',
      'enduring', 'multifaceted', 'nuanced', 'realm', 'landscape', 'crucial', 'paradigm',
    ],
  },
  {
    id: 'puffery',
    label: 'Significance inflation',
    weight: 1.2,
    terms: [
      'is a testament to', 'stands as', 'serves as a', 'plays a crucial role',
      'plays a pivotal role', 'plays a vital role', 'plays a significant role',
      'underscores the importance', 'reflects the broader', 'setting the stage',
      'represents a shift', 'key turning point', 'evolving landscape', 'focal point',
      'indelible mark', 'deeply rooted', 'rich tapestry',
    ],
  },
  {
    id: 'stock-phrases',
    label: 'Stock transitional phrases',
    weight: 1,
    terms: [
      'it is important to note', 'it\'s important to note', 'in today\'s fast-paced world',
      'in the ever-evolving', 'navigate the complexities', 'navigating the complexities',
      'when it comes to', 'a deep dive', 'valuable insights', 'align with', 'resonate with',
      'it is worth noting', 'that being said', 'at the end of the day',
    ],
  },
  {
    id: 'promotional',
    label: 'Promotional tone',
    weight: 0.8,
    terms: [
      'boasts', 'vibrant', 'profound', 'exemplifies', 'commitment to', 'natural beauty',
      'nestled', 'in the heart of', 'groundbreaking', 'renowned', 'diverse array',
      'seamless', 'seamlessly', 'unwavering', 'invaluable',
    ],
  },
  {
    id: 'transitions',
    label: 'Formal connective density',
    weight: 0.6,
    terms: [
      'furthermore', 'moreover', 'additionally', 'consequently', 'nevertheless',
      'notably', 'importantly', 'subsequently', 'thereby', 'henceforth',
    ],
  },
];

export interface LexiconHit {
  bucket: string
  term: string
  count: number
  weight: number
}

export function findLexiconHits(text: string): LexiconHit[] {
  const lowered = text.toLowerCase();
  const hits: LexiconHit[] = [];

  for (const bucket of AI_LEXICON) {
    for (const term of bucket.terms) {
      const pattern = new RegExp(`(?<![\\p{L}])${escapeRegExp(term)}(?![\\p{L}])`, 'giu');
      const count = (lowered.match(pattern) ?? []).length;

      if (count > 0) {
        hits.push({ bucket: bucket.label, term, count, weight: bucket.weight });
      }
    }
  }

  return hits.sort((a, b) => b.count * b.weight - a.count * a.weight);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Copy-paste residue from chat interfaces. These are near-unfakeable when present, and mean
 * nothing when absent — which is exactly how the detector weighs them.
 */
export const VENDOR_ARTIFACTS: { id: string; label: string; pattern: RegExp }[] = [
  { id: 'openai-citation', label: 'ChatGPT citation markup', pattern: /contentReference|oaicite|oai_citation|attributableIndex/g },
  { id: 'openai-turn', label: 'ChatGPT search turn marker', pattern: /\bturn\d+(?:search|view|news)\d+\b/g },
  { id: 'gemini-citation', label: 'Gemini citation marker', pattern: /\[cite:\s*\d+\]|\[span_\d+\]\(start_span\)/g },
  { id: 'grok-card', label: 'Grok render card', pattern: /grok_card|grok_render_citation_card_json/g },
  { id: 'perplexity-upload', label: 'Perplexity upload path', pattern: /ppl-ai-file-upload|pplx-res\.cloudinary/g },
  { id: 'lenticular-citation', label: 'Lenticular-bracket citation (【…†…】)', pattern: /【\d+[†:][^】]*】/g },
];

/** Crude language gate so the English-only phrase lists are not applied to other languages. */
export function looksLikeEnglish(words: string[]): boolean {
  if (words.length < 20) {
    return false;
  }

  return getFunctionWordShare(words) > 0.2;
}
