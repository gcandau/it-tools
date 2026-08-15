/**
 * Detection of invisible, zero-width and steganographic Unicode characters.
 *
 * This is the shared core behind the "AI watermark remover" and "AI text detector" tools, and
 * behind the `/api/v1/ai/*` endpoints. It is deliberately free of any DOM or Vue dependency so
 * that it runs unchanged in the browser and in a serverless function.
 *
 * The hard part is not finding invisible characters — `\p{Default_Ignorable_Code_Point}` does that
 * in one regex — it is *not destroying legitimate text*. Zero-width joiners are mandatory in emoji
 * sequences and Indic conjuncts, zero-width non-joiners are mandatory in Persian orthography,
 * variation selector 16 is mandatory for emoji presentation, and the Unicode Tags block is
 * legitimately used by regional flag sequences. Every candidate is therefore judged in context.
 */

// Zero-width and format controls
const SOFT_HYPHEN = 0x00AD;
const COMBINING_GRAPHEME_JOINER = 0x034F;
const ARABIC_LETTER_MARK = 0x061C;
const HANGUL_CHOSEONG_FILLER = 0x115F;
const HANGUL_JUNGSEONG_FILLER = 0x1160;
const MONGOLIAN_VOWEL_SEPARATOR = 0x180E;
const ZERO_WIDTH_SPACE = 0x200B;
const ZERO_WIDTH_NON_JOINER = 0x200C;
const ZERO_WIDTH_JOINER = 0x200D;
const WORD_JOINER = 0x2060;
const ZERO_WIDTH_NO_BREAK_SPACE = 0xFEFF;
const HANGUL_FILLER = 0x3164;
const HALFWIDTH_HANGUL_FILLER = 0xFFA0;
const BRAILLE_PATTERN_BLANK = 0x2800;
const OBJECT_REPLACEMENT_CHARACTER = 0xFFFC;

// Variation selectors: 16 low + 240 high = exactly 256, i.e. one byte each
const VS_LOW_START = 0xFE00;
const VS_LOW_END = 0xFE0F;
const VARIATION_SELECTOR_16 = 0xFE0F;
const VS_HIGH_START = 0xE0100;
const VS_HIGH_END = 0xE01EF;

// Unicode Tags block — "ASCII smuggling"
const TAG_BLOCK_START = 0xE0000;
const TAG_BLOCK_END = 0xE007F;
const TAG_OFFSET = 0xE0000;
const TAG_SPACE = 0xE0020;
const TAG_TILDE = 0xE007E;
const TAG_CANCEL = 0xE007F;
const LANGUAGE_TAG = 0xE0001;

const WAVING_BLACK_FLAG = 0x1F3F4;
const COMBINING_ENCLOSING_KEYCAP = 0x20E3;

const EXOTIC_SPACES = new Set([
  0x00A0, // NO-BREAK SPACE
  0x1680, // OGHAM SPACE MARK
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A,
  0x202F, // NARROW NO-BREAK SPACE
  0x205F, // MEDIUM MATHEMATICAL SPACE
  0x3000, // IDEOGRAPHIC SPACE
]);

const RE_DEFAULT_IGNORABLE = /\p{Default_Ignorable_Code_Point}/u;
const RE_EMOJI = /\p{Extended_Pictographic}/u;
const RE_HAN_LIKE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const RE_ARABIC_LIKE = /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Nko}\p{Script=Adlam}\p{Script=Thaana}]/u;
const RE_INDIC = /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Myanmar}\p{Script=Khmer}]/u;
const RE_RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}]/u;
const RE_BRAILLE_NON_BLANK = /[⠁-⣿]/;
const RE_KEYCAP_BASE = /[0-9#*]/;

/** How much a finding says about deliberate tampering. `none` means "legitimate in this context". */
export type FindingSeverity = 'none' | 'low' | 'medium' | 'high';

export type FindingClass =
  | 'zero-width'
  | 'bidi-control'
  | 'unicode-tag'
  | 'variation-selector'
  | 'filler'
  | 'deprecated-format'
  | 'reserved'
  | 'exotic-space'
  | 'other-invisible';

export interface InvisibleFinding {
  /** Index of the first UTF-16 code unit of this character in the source string. */
  index: number
  codePoint: number
  char: string
  /** Canonical `U+XXXX` label. */
  label: string
  name: string
  class: FindingClass
  severity: FindingSeverity
  /** Why this character was judged legitimate, when it was. */
  reason?: string
}

export interface HiddenPayload {
  encoding: 'unicode-tags' | 'variation-selectors'
  /** Decoded text, when the payload decodes to something printable. */
  text: string
  /** Raw decoded bytes, for the variation-selector channel. */
  bytes?: number[]
  index: number
}

export interface FindingSummaryEntry {
  label: string
  name: string
  class: FindingClass
  severity: FindingSeverity
  count: number
}

export interface InvisibleAnalysis {
  findings: InvisibleFinding[]
  /** Findings whose severity is not `none`. */
  suspicious: InvisibleFinding[]
  payloads: HiddenPayload[]
  summary: FindingSummaryEntry[]
  /** Longest run of consecutive zero-width characters — a strong encoding signal. */
  longestZeroWidthRun: number
}

export function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

const NAMES: Record<number, string> = {
  [SOFT_HYPHEN]: 'SOFT HYPHEN',
  [COMBINING_GRAPHEME_JOINER]: 'COMBINING GRAPHEME JOINER',
  [ARABIC_LETTER_MARK]: 'ARABIC LETTER MARK',
  [HANGUL_CHOSEONG_FILLER]: 'HANGUL CHOSEONG FILLER',
  [HANGUL_JUNGSEONG_FILLER]: 'HANGUL JUNGSEONG FILLER',
  [MONGOLIAN_VOWEL_SEPARATOR]: 'MONGOLIAN VOWEL SEPARATOR',
  0x180B: 'MONGOLIAN FREE VARIATION SELECTOR ONE',
  0x180C: 'MONGOLIAN FREE VARIATION SELECTOR TWO',
  0x180D: 'MONGOLIAN FREE VARIATION SELECTOR THREE',
  0x180F: 'MONGOLIAN FREE VARIATION SELECTOR FOUR',
  0x17B4: 'KHMER VOWEL INHERENT AQ',
  0x17B5: 'KHMER VOWEL INHERENT AA',
  [ZERO_WIDTH_SPACE]: 'ZERO WIDTH SPACE',
  [ZERO_WIDTH_NON_JOINER]: 'ZERO WIDTH NON-JOINER',
  [ZERO_WIDTH_JOINER]: 'ZERO WIDTH JOINER',
  0x200E: 'LEFT-TO-RIGHT MARK',
  0x200F: 'RIGHT-TO-LEFT MARK',
  0x202A: 'LEFT-TO-RIGHT EMBEDDING',
  0x202B: 'RIGHT-TO-LEFT EMBEDDING',
  0x202C: 'POP DIRECTIONAL FORMATTING',
  0x202D: 'LEFT-TO-RIGHT OVERRIDE',
  0x202E: 'RIGHT-TO-LEFT OVERRIDE',
  [WORD_JOINER]: 'WORD JOINER',
  0x2061: 'FUNCTION APPLICATION',
  0x2062: 'INVISIBLE TIMES',
  0x2063: 'INVISIBLE SEPARATOR',
  0x2064: 'INVISIBLE PLUS',
  0x2066: 'LEFT-TO-RIGHT ISOLATE',
  0x2067: 'RIGHT-TO-LEFT ISOLATE',
  0x2068: 'FIRST STRONG ISOLATE',
  0x2069: 'POP DIRECTIONAL ISOLATE',
  0x206A: 'INHIBIT SYMMETRIC SWAPPING',
  0x206B: 'ACTIVATE SYMMETRIC SWAPPING',
  0x206C: 'INHIBIT ARABIC FORM SHAPING',
  0x206D: 'ACTIVATE ARABIC FORM SHAPING',
  0x206E: 'NATIONAL DIGIT SHAPES',
  0x206F: 'NOMINAL DIGIT SHAPES',
  [BRAILLE_PATTERN_BLANK]: 'BRAILLE PATTERN BLANK',
  [HANGUL_FILLER]: 'HANGUL FILLER',
  [ZERO_WIDTH_NO_BREAK_SPACE]: 'ZERO WIDTH NO-BREAK SPACE (BOM)',
  [HALFWIDTH_HANGUL_FILLER]: 'HALFWIDTH HANGUL FILLER',
  [OBJECT_REPLACEMENT_CHARACTER]: 'OBJECT REPLACEMENT CHARACTER',
  [LANGUAGE_TAG]: 'LANGUAGE TAG (deprecated)',
  0x00A0: 'NO-BREAK SPACE',
  0x1680: 'OGHAM SPACE MARK',
  0x2000: 'EN QUAD',
  0x2001: 'EM QUAD',
  0x2002: 'EN SPACE',
  0x2003: 'EM SPACE',
  0x2004: 'THREE-PER-EM SPACE',
  0x2005: 'FOUR-PER-EM SPACE',
  0x2006: 'SIX-PER-EM SPACE',
  0x2007: 'FIGURE SPACE',
  0x2008: 'PUNCTUATION SPACE',
  0x2009: 'THIN SPACE',
  0x200A: 'HAIR SPACE',
  0x202F: 'NARROW NO-BREAK SPACE',
  0x205F: 'MEDIUM MATHEMATICAL SPACE',
  0x3000: 'IDEOGRAPHIC SPACE',
};

export function getCodePointName(codePoint: number): string {
  const known = NAMES[codePoint];
  if (known) {
    return known;
  }

  if (codePoint >= VS_LOW_START && codePoint <= VS_LOW_END) {
    return `VARIATION SELECTOR-${codePoint - VS_LOW_START + 1}`;
  }
  if (codePoint >= VS_HIGH_START && codePoint <= VS_HIGH_END) {
    return `VARIATION SELECTOR-${codePoint - VS_HIGH_START + 17}`;
  }
  if (codePoint === TAG_CANCEL) {
    return 'CANCEL TAG';
  }
  if (codePoint >= TAG_SPACE && codePoint <= TAG_TILDE) {
    return `TAG ${JSON.stringify(String.fromCodePoint(codePoint - TAG_OFFSET)).slice(1, -1)}`;
  }
  if (codePoint >= 0x1D173 && codePoint <= 0x1D17A) {
    return 'MUSICAL SYMBOL FORMAT CONTROL';
  }
  if (codePoint >= 0x1BCA0 && codePoint <= 0x1BCA3) {
    return 'SHORTHAND FORMAT CONTROL';
  }

  return `RESERVED ${formatCodePoint(codePoint)}`;
}

function classify(codePoint: number): FindingClass {
  if (codePoint >= TAG_BLOCK_START && codePoint <= TAG_BLOCK_END) {
    return 'unicode-tag';
  }
  if (isVariationSelector(codePoint)) {
    return 'variation-selector';
  }
  if (EXOTIC_SPACES.has(codePoint)) {
    return 'exotic-space';
  }
  if (
    (codePoint >= 0x202A && codePoint <= 0x202E)
    || (codePoint >= 0x2066 && codePoint <= 0x2069)
    || codePoint === 0x200E
    || codePoint === 0x200F
    || codePoint === ARABIC_LETTER_MARK
  ) {
    return 'bidi-control';
  }
  if (
    codePoint === HANGUL_FILLER
    || codePoint === HALFWIDTH_HANGUL_FILLER
    || codePoint === HANGUL_CHOSEONG_FILLER
    || codePoint === HANGUL_JUNGSEONG_FILLER
    || codePoint === BRAILLE_PATTERN_BLANK
  ) {
    return 'filler';
  }
  if (
    codePoint === ZERO_WIDTH_SPACE
    || codePoint === ZERO_WIDTH_NON_JOINER
    || codePoint === ZERO_WIDTH_JOINER
    || codePoint === WORD_JOINER
    || codePoint === ZERO_WIDTH_NO_BREAK_SPACE
    || codePoint === SOFT_HYPHEN
    || (codePoint >= 0x2061 && codePoint <= 0x2064)
  ) {
    return 'zero-width';
  }
  if (
    codePoint === MONGOLIAN_VOWEL_SEPARATOR
    || codePoint === LANGUAGE_TAG
    || (codePoint >= 0x206A && codePoint <= 0x206F)
  ) {
    return 'deprecated-format';
  }
  if (isReservedIgnorable(codePoint)) {
    return 'reserved';
  }

  return 'other-invisible';
}

function isVariationSelector(codePoint: number): boolean {
  return (codePoint >= VS_LOW_START && codePoint <= VS_LOW_END)
    || (codePoint >= VS_HIGH_START && codePoint <= VS_HIGH_END);
}

function isReservedIgnorable(codePoint: number): boolean {
  return codePoint === 0x2065
    || (codePoint >= 0xFFF0 && codePoint <= 0xFFF8)
    || codePoint === TAG_BLOCK_START
    || (codePoint >= 0xE0002 && codePoint <= 0xE001F)
    || (codePoint >= 0xE0080 && codePoint <= 0xE00FF)
    || (codePoint >= 0xE01F0 && codePoint <= 0xE0FFF);
}

/** A code point this module has an opinion about, whether or not it turns out to be legitimate. */
function isCandidate(char: string, codePoint: number): boolean {
  return RE_DEFAULT_IGNORABLE.test(char)
    || EXOTIC_SPACES.has(codePoint)
    || codePoint === BRAILLE_PATTERN_BLANK
    || codePoint === OBJECT_REPLACEMENT_CHARACTER;
}

interface CodePointEntry {
  codePoint: number
  char: string
  index: number
}

function toCodePoints(text: string): CodePointEntry[] {
  const entries: CodePointEntry[] = [];
  let index = 0;

  for (const char of text) {
    entries.push({ char, codePoint: char.codePointAt(0)!, index });
    index += char.length;
  }

  return entries;
}

/**
 * Indices (into the code-point array) that belong to a well-formed emoji tag sequence, i.e.
 * `U+1F3F4` followed by tag letters/digits and terminated by `U+E007F` — the encoding behind
 * subdivision flags such as 🏴󠁧󠁢󠁳󠁣󠁴󠁿. Tag characters anywhere else are smuggled data.
 */
function findLegitimateTagSequences(entries: CodePointEntry[]): Set<number> {
  const legitimate = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    if (entries[i].codePoint !== WAVING_BLACK_FLAG) {
      continue;
    }

    let j = i + 1;
    while (j < entries.length) {
      const cp = entries[j].codePoint;
      const isTagLetter = cp >= 0xE0061 && cp <= 0xE007A;
      const isTagDigit = cp >= 0xE0030 && cp <= 0xE0039;

      if (!isTagLetter && !isTagDigit) {
        break;
      }
      j++;
    }

    if (j > i + 1 && j < entries.length && entries[j].codePoint === TAG_CANCEL) {
      for (let k = i + 1; k <= j; k++) {
        legitimate.add(k);
      }
    }
  }

  return legitimate;
}

interface TextContext {
  hasRtlScript: boolean
  hasNonBlankBraille: boolean
}

function judge(
  entries: CodePointEntry[],
  position: number,
  legitimateTags: Set<number>,
  context: TextContext,
): { severity: FindingSeverity; reason?: string } {
  const { codePoint } = entries[position];

  // Neighbours, skipping variation selectors: in `❤️‍🔥` the character before the joiner is VS16,
  // not the emoji itself.
  const previous = previousSignificant(entries, position);
  const next = nextSignificant(entries, position);
  const immediatePrevious = position > 0 ? entries[position - 1] : undefined;
  const immediateNext = position + 1 < entries.length ? entries[position + 1] : undefined;

  switch (codePoint) {
    case ZERO_WIDTH_JOINER: {
      if (previous && next && RE_EMOJI.test(previous.char) && RE_EMOJI.test(next.char)) {
        return { severity: 'none', reason: 'Joins an emoji sequence' };
      }
      if (isAdjacentTo(previous, next, RE_INDIC)) {
        return { severity: 'none', reason: 'Forms an Indic conjunct' };
      }
      if (isAdjacentTo(previous, next, RE_ARABIC_LIKE)) {
        return { severity: 'none', reason: 'Controls Arabic-script joining' };
      }
      return { severity: 'high' };
    }

    case ZERO_WIDTH_NON_JOINER: {
      if (isAdjacentTo(previous, next, RE_ARABIC_LIKE)) {
        return { severity: 'none', reason: 'Required by Arabic-script orthography (e.g. Persian)' };
      }
      if (isAdjacentTo(previous, next, RE_INDIC)) {
        return { severity: 'none', reason: 'Suppresses an Indic conjunct' };
      }
      return { severity: 'high' };
    }

    case ZERO_WIDTH_NO_BREAK_SPACE:
      return position === 0
        ? { severity: 'none', reason: 'Byte-order mark at the start of the text' }
        : { severity: 'medium' };

    case BRAILLE_PATTERN_BLANK:
      return context.hasNonBlankBraille
        ? { severity: 'none', reason: 'Part of Braille text' }
        : { severity: 'medium' };

    case OBJECT_REPLACEMENT_CHARACTER:
      return { severity: 'low', reason: 'Usually a paste artifact from a word processor' };

    default:
      break;
  }

  if (isVariationSelector(codePoint)) {
    if (codePoint === VARIATION_SELECTOR_16 || codePoint === VS_LOW_START + 14) {
      if (immediatePrevious && RE_EMOJI.test(immediatePrevious.char)) {
        return { severity: 'none', reason: 'Selects emoji or text presentation' };
      }
      if (
        immediatePrevious
        && RE_KEYCAP_BASE.test(immediatePrevious.char)
        && immediateNext?.codePoint === COMBINING_ENCLOSING_KEYCAP
      ) {
        return { severity: 'none', reason: 'Part of a keycap sequence' };
      }
    }
    if (immediatePrevious && RE_HAN_LIKE.test(immediatePrevious.char)) {
      return { severity: 'none', reason: 'Ideographic variation sequence' };
    }
    return { severity: 'high' };
  }

  if (codePoint >= TAG_BLOCK_START && codePoint <= TAG_BLOCK_END) {
    return legitimateTags.has(position)
      ? { severity: 'none', reason: 'Part of an emoji flag sequence' }
      : { severity: 'high' };
  }

  if (classify(codePoint) === 'bidi-control') {
    if (context.hasRtlScript) {
      return { severity: 'none', reason: 'Text contains right-to-left script' };
    }
    return { severity: 'high', reason: 'Bidirectional control in text with no RTL script' };
  }

  if (EXOTIC_SPACES.has(codePoint)) {
    return { severity: 'low' };
  }

  if (isReservedIgnorable(codePoint)) {
    return { severity: 'high', reason: 'Unassigned code point — nothing legitimate produces it' };
  }

  return { severity: 'medium' };
}

function isAdjacentTo(
  previous: CodePointEntry | undefined,
  next: CodePointEntry | undefined,
  script: RegExp,
): boolean {
  return Boolean((previous && script.test(previous.char)) || (next && script.test(next.char)));
}

function previousSignificant(entries: CodePointEntry[], position: number): CodePointEntry | undefined {
  for (let i = position - 1; i >= 0; i--) {
    if (!isVariationSelector(entries[i].codePoint)) {
      return entries[i];
    }
  }
  return undefined;
}

function nextSignificant(entries: CodePointEntry[], position: number): CodePointEntry | undefined {
  for (let i = position + 1; i < entries.length; i++) {
    if (!isVariationSelector(entries[i].codePoint)) {
      return entries[i];
    }
  }
  return undefined;
}

/**
 * Decode the two steganographic channels that carry real payloads.
 *
 * - Unicode Tags: `U+E0020`–`U+E007E` mirror printable ASCII at an offset of `0xE0000`.
 * - Variation selectors: 16 low + 240 high selectors map onto the 256 byte values, so an arbitrary
 *   byte string can ride invisibly behind a single visible character.
 */
function decodePayloads(entries: CodePointEntry[], suspiciousPositions: Set<number>): HiddenPayload[] {
  const payloads: HiddenPayload[] = [];

  let tagRun: number[] = [];
  let tagStart = 0;
  let vsRun: number[] = [];
  let vsStart = 0;

  const flushTags = () => {
    if (tagRun.length > 0) {
      payloads.push({
        encoding: 'unicode-tags',
        text: tagRun.map(cp => String.fromCodePoint(cp - TAG_OFFSET)).join(''),
        index: tagStart,
      });
      tagRun = [];
    }
  };

  const flushVariationSelectors = () => {
    if (vsRun.length >= 2) {
      const bytes = vsRun.map(cp => (cp <= VS_LOW_END ? cp - VS_LOW_START : cp - VS_HIGH_START + 16));
      payloads.push({
        encoding: 'variation-selectors',
        text: decodeUtf8(bytes),
        bytes,
        index: vsStart,
      });
    }
    vsRun = [];
  };

  entries.forEach((entry, position) => {
    const { codePoint } = entry;
    const suspicious = suspiciousPositions.has(position);

    if (suspicious && codePoint >= TAG_SPACE && codePoint <= TAG_TILDE) {
      if (tagRun.length === 0) {
        tagStart = entry.index;
      }
      tagRun.push(codePoint);
    }
    else {
      flushTags();
    }

    if (suspicious && isVariationSelector(codePoint)) {
      if (vsRun.length === 0) {
        vsStart = entry.index;
      }
      vsRun.push(codePoint);
    }
    else {
      flushVariationSelectors();
    }
  });

  flushTags();
  flushVariationSelectors();

  return payloads;
}

function decodeUtf8(bytes: number[]): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
  }
  catch {
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  }
}

export function analyseInvisibleCharacters(text: string): InvisibleAnalysis {
  const entries = toCodePoints(text);
  const legitimateTags = findLegitimateTagSequences(entries);
  const context: TextContext = {
    hasRtlScript: RE_RTL_SCRIPT.test(text),
    hasNonBlankBraille: RE_BRAILLE_NON_BLANK.test(text),
  };

  const findings: InvisibleFinding[] = [];
  const suspiciousPositions = new Set<number>();

  entries.forEach((entry, position) => {
    if (!isCandidate(entry.char, entry.codePoint)) {
      return;
    }

    const { severity, reason } = judge(entries, position, legitimateTags, context);

    if (severity !== 'none') {
      suspiciousPositions.add(position);
    }

    findings.push({
      index: entry.index,
      codePoint: entry.codePoint,
      char: entry.char,
      label: formatCodePoint(entry.codePoint),
      name: getCodePointName(entry.codePoint),
      class: classify(entry.codePoint),
      severity,
      reason,
    });
  });

  const suspicious = findings.filter(finding => finding.severity !== 'none');

  return {
    findings,
    suspicious,
    payloads: decodePayloads(entries, suspiciousPositions),
    summary: summarise(findings),
    longestZeroWidthRun: getLongestZeroWidthRun(entries),
  };
}

function summarise(findings: InvisibleFinding[]): FindingSummaryEntry[] {
  const byLabel = new Map<string, FindingSummaryEntry>();

  for (const finding of findings) {
    const key = `${finding.label}|${finding.severity}`;
    const existing = byLabel.get(key);

    if (existing) {
      existing.count++;
    }
    else {
      byLabel.set(key, {
        label: finding.label,
        name: finding.name,
        class: finding.class,
        severity: finding.severity,
        count: 1,
      });
    }
  }

  return [...byLabel.values()].sort((a, b) => b.count - a.count);
}

function getLongestZeroWidthRun(entries: CodePointEntry[]): number {
  const zeroWidth = new Set([
    ZERO_WIDTH_SPACE,
    ZERO_WIDTH_NON_JOINER,
    ZERO_WIDTH_JOINER,
    WORD_JOINER,
    ZERO_WIDTH_NO_BREAK_SPACE,
  ]);

  let longest = 0;
  let current = 0;

  for (const entry of entries) {
    if (zeroWidth.has(entry.codePoint)) {
      current++;
      longest = Math.max(longest, current);
    }
    else {
      current = 0;
    }
  }

  return longest;
}

export type StripMode = 'safe' | 'aggressive';

/**
 * Remove invisible characters.
 *
 * `safe` removes only what the context guards judged suspicious, and leaves exotic spaces alone —
 * those are normalised by the typography pass instead, which turns them into ordinary spaces rather
 * than deleting them. `aggressive` removes every candidate, including emoji joiners and Persian
 * non-joiners, and *will* corrupt such text.
 */
export function stripInvisibleCharacters(
  text: string,
  { mode = 'safe' }: { mode?: StripMode } = {},
): { text: string; removed: InvisibleFinding[] } {
  const { findings } = analyseInvisibleCharacters(text);

  const shouldRemove = (finding: InvisibleFinding) =>
    mode === 'aggressive'
      ? finding.class !== 'exotic-space'
      : finding.severity === 'high' || finding.severity === 'medium';

  const removed = findings.filter(shouldRemove);
  const removedIndices = new Set(removed.map(finding => finding.index));

  if (removedIndices.size === 0) {
    return { text, removed: [] };
  }

  let output = '';
  let index = 0;

  for (const char of text) {
    if (!removedIndices.has(index)) {
      output += char;
    }
    index += char.length;
  }

  return { text: output, removed };
}
