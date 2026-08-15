/**
 * Typographic normalisation — folding "smart" punctuation back to plain ASCII.
 *
 * A word of honesty about what this is for. Em dashes, curly quotes, ellipsis characters and
 * non-breaking spaces are routinely described as "AI tells". They are not watermarks: Microsoft
 * Word, Google Docs and iOS all produce them by autocorrect, and professional editors have used
 * them for centuries. This pass exists because plain ASCII is often what you actually want when
 * pasting text into code, a terminal or a system with a narrow encoding — not because removing an
 * em dash removes anything a model put there.
 *
 * Em-dash conversion in particular is off by default: it is the single most-cited and least
 * reliable of these signals.
 */

// Written as escapes on purpose: several of these are indistinguishable from ASCII in an editor,
// and an accidental U+0020 in the space list would silently map ordinary spaces to themselves.
const DASHES = [
  '‐', // HYPHEN
  '‑', // NON-BREAKING HYPHEN
  '‒', // FIGURE DASH
  '–', // EN DASH
  '―', // HORIZONTAL BAR
  '−', // MINUS SIGN
  '⸺', // TWO-EM DASH
  '⸻', // THREE-EM DASH
];

const SINGLE_QUOTES = [
  '‘', // LEFT SINGLE QUOTATION MARK
  '’', // RIGHT SINGLE QUOTATION MARK
  '‚', // SINGLE LOW-9 QUOTATION MARK
  '‛', // SINGLE HIGH-REVERSED-9 QUOTATION MARK
  '′', // PRIME
  '‵', // REVERSED PRIME
  'ʼ', // MODIFIER LETTER APOSTROPHE
  '´', // ACUTE ACCENT
];

const DOUBLE_QUOTES = [
  '“', // LEFT DOUBLE QUOTATION MARK
  '”', // RIGHT DOUBLE QUOTATION MARK
  '„', // DOUBLE LOW-9 QUOTATION MARK
  '‟', // DOUBLE HIGH-REVERSED-9 QUOTATION MARK
  '″', // DOUBLE PRIME
  '‶', // REVERSED DOUBLE PRIME
  '«', // LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
  '»', // RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
  '‹', // SINGLE LEFT-POINTING ANGLE QUOTATION MARK
  '›', // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
  '˝', // DOUBLE ACUTE ACCENT
];

const ELLIPSES = [
  '…', // HORIZONTAL ELLIPSIS
  '⋯', // MIDLINE HORIZONTAL ELLIPSIS
  '‥', // TWO DOT LEADER
];

const BULLETS = [
  '•', // BULLET
  '‣', // TRIANGULAR BULLET
  '◦', // WHITE BULLET
  '⁃', // HYPHEN BULLET
  '∙', // BULLET OPERATOR
];

const SPACES = [
  ' ', // NO-BREAK SPACE
  ' ', // OGHAM SPACE MARK
  ' ', // EN QUAD
  ' ', // EM QUAD
  ' ', // EN SPACE
  ' ', // EM SPACE
  ' ', // THREE-PER-EM SPACE
  ' ', // FOUR-PER-EM SPACE
  ' ', // SIX-PER-EM SPACE
  ' ', // FIGURE SPACE
  ' ', // PUNCTUATION SPACE
  ' ', // THIN SPACE
  ' ', // HAIR SPACE
  ' ', // NARROW NO-BREAK SPACE
  ' ', // MEDIUM MATHEMATICAL SPACE
  '　', // IDEOGRAPHIC SPACE
];

const EM_DASH = '—';

export interface TypographyOptions {
  /** Fold en dashes, minus signs and figure dashes to `-`. */
  dashes?: boolean
  /** Fold curly quotes, primes and guillemets to `'` and `"`. */
  quotes?: boolean
  /** Fold `…` to `...`. */
  ellipses?: boolean
  /** Fold non-breaking, narrow, thin and ideographic spaces to an ordinary space. */
  spaces?: boolean
  /** Fold bullet characters to `-`. */
  bullets?: boolean
  /** What to do with `—`. Off by default: an em dash is a style choice, not a marker. */
  emDash?: 'keep' | 'hyphen' | 'double-hyphen' | 'spaced-hyphen'
}

export interface TypographyFinding {
  index: number
  char: string
  replacement: string
  label: string
  category: 'dash' | 'quote' | 'ellipsis' | 'space' | 'bullet' | 'em-dash'
}

const DEFAULT_OPTIONS: Required<TypographyOptions> = {
  dashes: true,
  quotes: true,
  ellipses: true,
  spaces: true,
  bullets: true,
  emDash: 'keep',
};

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function buildMap(options: Required<TypographyOptions>): Map<string, { replacement: string; category: TypographyFinding['category'] }> {
  const map = new Map<string, { replacement: string; category: TypographyFinding['category'] }>();

  const add = (chars: string[], replacement: string, category: TypographyFinding['category']) => {
    for (const char of chars) {
      map.set(char, { replacement, category });
    }
  };

  if (options.dashes) {
    add(DASHES, '-', 'dash');
  }
  if (options.quotes) {
    add(SINGLE_QUOTES, '\'', 'quote');
    add(DOUBLE_QUOTES, '"', 'quote');
  }
  if (options.ellipses) {
    add(ELLIPSES, '...', 'ellipsis');
  }
  if (options.spaces) {
    add(SPACES, ' ', 'space');
  }
  if (options.bullets) {
    add(BULLETS, '-', 'bullet');
  }
  if (options.emDash !== 'keep') {
    const replacement = { 'hyphen': '-', 'double-hyphen': '--', 'spaced-hyphen': ' - ' }[options.emDash];
    add([EM_DASH], replacement, 'em-dash');
  }

  return map;
}

export function normaliseTypography(
  text: string,
  options: TypographyOptions = {},
): { text: string; findings: TypographyFinding[] } {
  const resolved = { ...DEFAULT_OPTIONS, ...options };
  const map = buildMap(resolved);
  const findings: TypographyFinding[] = [];

  let output = '';
  let index = 0;

  for (const char of text) {
    const mapped = map.get(char);

    if (mapped) {
      findings.push({
        index,
        char,
        replacement: mapped.replacement,
        label: formatCodePoint(char.codePointAt(0)!),
        category: mapped.category,
      });
      output += mapped.replacement;
    }
    else {
      output += char;
    }

    index += char.length;
  }

  return { text: output, findings };
}

export interface WhitespaceOptions {
  /** Collapse runs of two or more spaces or tabs into one space. */
  collapseSpaces?: boolean
  /** Remove trailing spaces and tabs at the end of every line. */
  trimLineEnds?: boolean
  /** Normalise CRLF and CR line endings to LF. */
  normaliseLineEndings?: boolean
  /** Collapse three or more consecutive blank lines into one. */
  collapseBlankLines?: boolean
  /** Trim leading and trailing whitespace from the whole text. */
  trim?: boolean
}

const DEFAULT_WHITESPACE: Required<WhitespaceOptions> = {
  collapseSpaces: true,
  trimLineEnds: true,
  normaliseLineEndings: true,
  collapseBlankLines: true,
  trim: false,
};

export function normaliseWhitespace(text: string, options: WhitespaceOptions = {}): string {
  const resolved = { ...DEFAULT_WHITESPACE, ...options };
  let output = text;

  if (resolved.normaliseLineEndings) {
    output = output.replace(/\r\n?/g, '\n');
  }
  if (resolved.collapseSpaces) {
    output = output.replace(/[ \t]{2,}/g, ' ');
  }
  if (resolved.trimLineEnds) {
    output = output.replace(/[ \t]+$/gm, '');
  }
  if (resolved.collapseBlankLines) {
    output = output.replace(/\n{3,}/g, '\n\n');
  }
  if (resolved.trim) {
    output = output.trim();
  }

  return output;
}
