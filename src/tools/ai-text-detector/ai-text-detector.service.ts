import {
  type BurstinessResult,
  type LexiconHit,
  MINIMUM_WORD_COUNT,
  type PunctuationProfile,
  STRUCTURAL_PATTERNS,
  VENDOR_ARTIFACTS,
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
import { analyseInvisibleCharacters } from '@/utils/unicode-invisible';
import { detectHomoglyphs } from '@/utils/unicode-homoglyphs';

export { MINIMUM_WORD_COUNT };

/**
 * How much weight a signal deserves. This is displayed next to every signal, because the honest
 * answer is that only the first tier is worth much.
 */
export type SignalReliability = 'high' | 'medium' | 'low' | 'very-low';

export interface Signal {
  id: string
  label: string
  reliability: SignalReliability
  /** How far this signal leans towards "machine-generated", in [0, 1]. */
  score: number
  /** What was actually measured, in words. */
  detail: string
  evidence: string[]
}

export type VerdictBand = 'insufficient' | 'none' | 'weak' | 'moderate' | 'strong';

export interface Verdict {
  band: VerdictBand
  label: string
  summary: string
}

export interface DetectionResult {
  wordCount: number
  sentenceCount: number
  scorable: boolean
  isEnglish: boolean
  /** Character-level findings: high precision, and they prove tampering rather than authorship. */
  hardEvidence: Signal[]
  /** Style statistics: informative, but never evidence. */
  stylometry: Signal[]
  verdict: Verdict
  metrics: {
    burstiness: BurstinessResult
    mtld: number
    mattr: number
    hapaxRatio: number
    distinctTrigramRatio: number
    distinctQuadgramRatio: number
    functionWordShare: number
    punctuation: PunctuationProfile
    lexiconHits: LexiconHit[]
  }
}

/** Map a measurement onto [0, 1] between a "human-looking" and a "machine-looking" anchor. */
function ramp(value: number, humanAnchor: number, machineAnchor: number): number {
  if (humanAnchor === machineAnchor) {
    return 0;
  }

  const ratio = (value - humanAnchor) / (machineAnchor - humanAnchor);

  return Math.min(1, Math.max(0, ratio));
}

function getHardEvidence(text: string): Signal[] {
  const signals: Signal[] = [];

  const invisible = analyseInvisibleCharacters(text);
  const tagFindings = invisible.suspicious.filter(finding => finding.class === 'unicode-tag');
  const selectorFindings = invisible.suspicious.filter(finding => finding.class === 'variation-selector');
  const zeroWidthFindings = invisible.suspicious.filter(finding => finding.class === 'zero-width');

  if (invisible.payloads.length > 0) {
    signals.push({
      id: 'hidden-payload',
      label: 'Decoded hidden payload',
      reliability: 'high',
      score: 1,
      detail: `${invisible.payloads.length} hidden payload(s) decoded from invisible characters.`,
      evidence: invisible.payloads.map(
        payload => `${payload.encoding === 'unicode-tags' ? 'Unicode Tags' : 'Variation selectors'} at offset ${payload.index}: "${truncate(payload.text)}"`,
      ),
    });
  }

  if (tagFindings.length > 0 || selectorFindings.length > 0) {
    signals.push({
      id: 'steganographic-characters',
      label: 'Steganographic characters',
      reliability: 'high',
      score: 1,
      detail: `${tagFindings.length} Tags-block and ${selectorFindings.length} orphaned variation-selector character(s), outside any legitimate emoji sequence.`,
      evidence: [...tagFindings, ...selectorFindings].slice(0, 10).map(
        finding => `${finding.label} ${finding.name} at offset ${finding.index}`,
      ),
    });
  }

  const vendorHits = VENDOR_ARTIFACTS.flatMap(({ label, pattern }) => {
    const matches = text.match(pattern) ?? [];
    return matches.length > 0 ? [{ label, matches }] : [];
  });

  if (vendorHits.length > 0) {
    signals.push({
      id: 'vendor-artifacts',
      label: 'Chat interface copy-paste residue',
      reliability: 'high',
      score: 1,
      detail: 'Markup that only appears when text is copied out of an AI chat interface.',
      evidence: vendorHits.map(hit => `${hit.label}: ${hit.matches.slice(0, 3).map(truncate).join(', ')}`),
    });
  }

  if (zeroWidthFindings.length > 0) {
    // A run of 8+ is a binary encoding at any length. Density, on the other hand, only means
    // something once there is enough text for it to be a rate rather than an accident.
    const length = [...text].length;
    const dense = invisible.longestZeroWidthRun >= 8
      || (length >= 200 && zeroWidthFindings.length / length > 1 / 200);

    signals.push({
      id: 'zero-width-characters',
      label: 'Zero-width characters',
      reliability: dense ? 'high' : 'medium',
      score: dense ? 1 : 0.6,
      detail: dense
        ? `${zeroWidthFindings.length} zero-width character(s), longest run ${invisible.longestZeroWidthRun} — consistent with a binary encoding.`
        : `${zeroWidthFindings.length} isolated zero-width character(s).`,
      evidence: zeroWidthFindings.slice(0, 10).map(
        finding => `${finding.label} ${finding.name} at offset ${finding.index}`,
      ),
    });
  }

  const homoglyphs = detectHomoglyphs(text);
  if (homoglyphs.length > 0) {
    signals.push({
      id: 'homoglyphs',
      label: 'Homoglyph substitution',
      reliability: 'medium',
      score: 0.8,
      detail: `${homoglyphs.length} non-Latin lookalike character(s) inside Latin words. Evidence of tampering, not of AI authorship.`,
      evidence: homoglyphs.slice(0, 10).map(
        finding => `${finding.label} "${finding.char}" in "${finding.word}" → "${finding.replacement}"`,
      ),
    });
  }

  return signals;
}

function truncate(value: string, length = 80): string {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function getStylometry(
  text: string,
  words: string[],
  sentences: string[],
  isEnglish: boolean,
): { signals: Signal[]; metrics: DetectionResult['metrics'] } {
  const sentenceLengths = sentences.map(sentence => splitWords(sentence).length).filter(length => length > 0);
  const burstiness = getBurstiness(sentenceLengths);
  const mtld = getMtld(words);
  const mattr = getMattr(words);
  const hapaxRatio = getHapaxRatio(words);
  const distinctTrigramRatio = getDistinctNgramRatio(words, 3);
  const distinctQuadgramRatio = getDistinctNgramRatio(words, 4);
  const functionWordShare = getFunctionWordShare(words);
  const punctuation = getPunctuationProfile(text, words.length);
  const lexiconHits = isEnglish ? findLexiconHits(text) : [];

  const signals: Signal[] = [];

  // Human writing varies sentence length far more than model output does. Published "human 0.6-1.0
  // vs AI 0.15-0.30" bands come from vendor blogs rather than peer review, so this is graded low.
  signals.push({
    id: 'burstiness',
    label: 'Burstiness (sentence-length variation)',
    reliability: 'low',
    score: ramp(burstiness.coefficientOfVariation, 0.75, 0.25),
    detail: `Coefficient of variation ${burstiness.coefficientOfVariation.toFixed(2)} (mean ${burstiness.meanSentenceLength.toFixed(1)} words, σ ${burstiness.standardDeviation.toFixed(1)}).`,
    evidence: [`Bounded burstiness ${burstiness.bounded.toFixed(2)} on a −1 to 1 scale.`],
  });

  signals.push({
    id: 'sentence-uniformity',
    label: 'Sentence-length uniformity',
    reliability: 'low',
    score: ramp(burstiness.clusteredShare, 0.3, 0.75),
    detail: `${(burstiness.clusteredShare * 100).toFixed(0)}% of sentences are within ±20% of the mean length.`,
    evidence: [],
  });

  signals.push({
    id: 'lexical-diversity',
    label: 'Lexical diversity (MTLD)',
    reliability: 'low',
    score: ramp(mtld, 110, 55),
    detail: `MTLD ${mtld.toFixed(1)}, MATTR-50 ${mattr.toFixed(2)}, hapax ratio ${(hapaxRatio * 100).toFixed(0)}%.`,
    evidence: ['Raw type-token ratio is deliberately not used: it measures length, not richness.'],
  });

  signals.push({
    id: 'ngram-repetition',
    label: 'Phrase repetition',
    reliability: 'low',
    score: ramp(distinctQuadgramRatio, 1, 0.9),
    detail: `${(distinctTrigramRatio * 100).toFixed(1)}% distinct trigrams, ${(distinctQuadgramRatio * 100).toFixed(1)}% distinct 4-grams.`,
    evidence: [],
  });

  if (isEnglish) {
    const lexiconWeight = lexiconHits.reduce((total, hit) => total + hit.count * hit.weight, 0);
    const per1000 = words.length === 0 ? 0 : (lexiconWeight / words.length) * 1000;

    signals.push({
      id: 'ai-lexicon',
      label: 'AI-associated vocabulary',
      reliability: 'medium',
      score: ramp(per1000, 1, 12),
      detail: `Weighted density ${per1000.toFixed(1)} per 1000 words across ${lexiconHits.length} distinct term(s).`,
      evidence: lexiconHits.slice(0, 10).map(hit => `"${hit.term}" ×${hit.count} (${hit.bucket})`),
    });

    const structuralHits = STRUCTURAL_PATTERNS.flatMap(({ label, pattern }) => {
      const matches = text.match(pattern) ?? [];
      return matches.length > 0 ? [{ label, matches }] : [];
    });
    const structuralCount = structuralHits.reduce((total, hit) => total + hit.matches.length, 0);

    signals.push({
      id: 'structural-tells',
      label: 'Structural constructions',
      reliability: 'medium',
      score: ramp(words.length === 0 ? 0 : (structuralCount / words.length) * 1000, 0.5, 6),
      detail: structuralCount === 0
        ? 'No characteristic constructions found.'
        : `${structuralCount} occurrence(s) of constructions LLM prose over-produces.`,
      evidence: structuralHits.map(hit => `${hit.label}: ${hit.matches.length}`),
    });
  }

  signals.push({
    id: 'punctuation-profile',
    label: 'Punctuation and register',
    reliability: 'very-low',
    score: ramp(punctuation.emDashPer1000, 0.5, 8) * 0.5
      + ramp(3 - Math.min(3, punctuation.contractionsPer1000), 0, 3) * 0.5,
    detail: `${punctuation.emDashPer1000.toFixed(1)} em dashes and ${punctuation.contractionsPer1000.toFixed(1)} contractions per 1000 words; ${punctuation.curlyQuoteCount} curly quote(s); ${punctuation.closerCount} wrap-up phrase(s).`,
    evidence: ['Word processors produce em dashes and curly quotes by autocorrect. Treat as near-noise.'],
  });

  return {
    signals,
    metrics: {
      burstiness,
      mtld,
      mattr,
      hapaxRatio,
      distinctTrigramRatio,
      distinctQuadgramRatio,
      functionWordShare,
      punctuation,
      lexiconHits,
    },
  };
}

const RELIABILITY_WEIGHT: Record<SignalReliability, number> = {
  'high': 1,
  'medium': 0.5,
  'low': 0.2,
  'very-low': 0.05,
};

function getVerdict(hardEvidence: Signal[], stylometry: Signal[], scorable: boolean): Verdict {
  const conclusive = hardEvidence.filter(signal => signal.reliability === 'high' && signal.score >= 1);

  if (conclusive.length > 0) {
    return {
      band: 'strong',
      label: 'Hidden markers found',
      summary:
        'This text contains characters or markup that do not occur by accident. That proves the text '
        + 'was deliberately marked or manipulated — most likely pasted from an AI chat interface, or '
        + 'carrying a tracking or prompt-injection payload. It is not, by itself, proof of who or what '
        + 'wrote the words.',
    };
  }

  if (!scorable) {
    return {
      band: 'insufficient',
      label: 'Too short to analyse',
      summary:
        `Style statistics need at least ${MINIMUM_WORD_COUNT} words to mean anything. Below that they are `
        + 'noise, so no score is shown. The hidden-character checks above still apply at any length.',
    };
  }

  const weighted = stylometry.reduce(
    (total, signal) => total + signal.score * RELIABILITY_WEIGHT[signal.reliability],
    0,
  );
  const maximum = stylometry.reduce(
    (total, signal) => total + RELIABILITY_WEIGHT[signal.reliability],
    0,
  );
  const ratio = maximum === 0 ? 0 : weighted / maximum;

  if (ratio >= 0.66) {
    return {
      band: 'moderate',
      label: 'Several stylistic markers present',
      summary:
        'The writing is uniform and uses vocabulary associated with LLM output. Careful, formal, '
        + 'technical or non-native writing scores the same way, so this is a description of style, '
        + 'not a finding about authorship.',
    };
  }

  if (ratio >= 0.4) {
    return {
      band: 'weak',
      label: 'Some stylistic markers present',
      summary:
        'A few style statistics lean towards machine-generated prose, but not consistently. This is '
        + 'far too weak to draw any conclusion from.',
    };
  }

  return {
    band: 'none',
    label: 'No notable markers',
    summary:
      'Neither hidden characters nor a consistent stylistic pattern were found. That does not mean the '
      + 'text was not AI-generated: statistical watermarks leave no characters behind, and any text can '
      + 'be edited into a different style.',
  };
}

export function detectAiText(text: string): DetectionResult {
  const words = splitWords(text);
  const sentences = splitSentences(text);
  const scorable = words.length >= MINIMUM_WORD_COUNT;
  const isEnglish = looksLikeEnglish(words);

  const hardEvidence = getHardEvidence(text);
  const { signals: stylometry, metrics } = getStylometry(text, words, sentences, isEnglish);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    scorable,
    isEnglish,
    hardEvidence,
    stylometry,
    verdict: getVerdict(hardEvidence, stylometry, scorable),
    metrics,
  };
}
