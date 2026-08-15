import {
  type InvisibleFinding,
  type StripMode,
  analyseInvisibleCharacters,
  stripInvisibleCharacters,
} from '@/utils/unicode-invisible';
import {
  type HomoglyphFinding,
  type StyledLatinFinding,
  normaliseHomoglyphs,
  normaliseStyledLatin,
} from '@/utils/unicode-homoglyphs';
import {
  type TypographyFinding,
  type TypographyOptions,
  normaliseTypography,
  normaliseWhitespace,
} from '@/utils/unicode-typography';

export interface CleaningOptions {
  /** Strip zero-width, tag, bidi and other invisible characters. */
  invisible: boolean
  /** `safe` keeps contextually legitimate characters; `aggressive` removes everything. */
  mode: StripMode
  /** Fold Cyrillic/Greek/Cherokee lookalikes back to Latin inside Latin words. */
  homoglyphs: boolean
  /** Fold fullwidth and mathematical alphanumerics to plain ASCII. */
  styledLatin: boolean
  /** Fold smart quotes, dashes, ellipses and exotic spaces to ASCII. */
  typography: boolean
  emDash: NonNullable<TypographyOptions['emDash']>
  /** Collapse repeated spaces, trim line ends, normalise line endings. */
  whitespace: boolean
}

export const defaultCleaningOptions: CleaningOptions = {
  invisible: true,
  mode: 'safe',
  homoglyphs: true,
  styledLatin: false,
  typography: true,
  emDash: 'keep',
  whitespace: false,
};

export interface CleaningReport {
  text: string
  invisibleRemoved: InvisibleFinding[]
  homoglyphsReplaced: HomoglyphFinding[]
  styledLatinFolded: StyledLatinFinding[]
  typographyChanged: TypographyFinding[]
  whitespaceChanged: boolean
  changed: boolean
  stats: {
    inputLength: number
    outputLength: number
    charactersRemoved: number
    charactersRewritten: number
  }
}

/**
 * Run the cleaning passes in a fixed order: invisible characters first, because everything after
 * it works on visible text, then homoglyphs, then styled Latin, then typography, then whitespace.
 */
export function cleanText(input: string, options: Partial<CleaningOptions> = {}): CleaningReport {
  const resolved = { ...defaultCleaningOptions, ...options };

  let text = input;
  let invisibleRemoved: InvisibleFinding[] = [];
  let homoglyphsReplaced: HomoglyphFinding[] = [];
  let styledLatinFolded: StyledLatinFinding[] = [];
  let typographyChanged: TypographyFinding[] = [];

  if (resolved.invisible) {
    const result = stripInvisibleCharacters(text, { mode: resolved.mode });
    text = result.text;
    invisibleRemoved = result.removed;
  }

  if (resolved.homoglyphs) {
    const result = normaliseHomoglyphs(text);
    text = result.text;
    homoglyphsReplaced = result.findings;
  }

  if (resolved.styledLatin) {
    const result = normaliseStyledLatin(text);
    text = result.text;
    styledLatinFolded = result.findings;
  }

  if (resolved.typography) {
    const result = normaliseTypography(text, { emDash: resolved.emDash });
    text = result.text;
    typographyChanged = result.findings;
  }

  const beforeWhitespace = text;
  if (resolved.whitespace) {
    text = normaliseWhitespace(text);
  }

  return {
    text,
    invisibleRemoved,
    homoglyphsReplaced,
    styledLatinFolded,
    typographyChanged,
    whitespaceChanged: text !== beforeWhitespace,
    changed: text !== input,
    stats: {
      inputLength: [...input].length,
      outputLength: [...text].length,
      charactersRemoved: invisibleRemoved.length,
      charactersRewritten:
        homoglyphsReplaced.length + styledLatinFolded.length + typographyChanged.length,
    },
  };
}

export interface DisplaySegment {
  type: 'text' | 'invisible'
  value: string
  finding?: InvisibleFinding
}

/**
 * Split the text so the UI can render invisible characters as visible badges. Returns a flat list
 * of runs of ordinary text interleaved with the individual characters that were detected.
 */
export function segmentForDisplay(text: string, findings: InvisibleFinding[]): DisplaySegment[] {
  if (findings.length === 0) {
    return text === '' ? [] : [{ type: 'text', value: text }];
  }

  const byIndex = new Map(findings.map(finding => [finding.index, finding]));
  const segments: DisplaySegment[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer !== '') {
      segments.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  for (const char of text) {
    const finding = byIndex.get(index);

    if (finding) {
      flush();
      segments.push({ type: 'invisible', value: char, finding });
    }
    else {
      buffer += char;
    }

    index += char.length;
  }

  flush();

  return segments;
}

/** Non-destructive analysis, used by the report panel and by `POST /api/v1/ai/watermark/detect`. */
export function analyseText(text: string) {
  const invisible = analyseInvisibleCharacters(text);
  const { findings: homoglyphs } = normaliseHomoglyphs(text);
  const { findings: typography } = normaliseTypography(text);

  return {
    invisible,
    homoglyphs,
    typography,
    hasHiddenPayload: invisible.payloads.length > 0,
    suspiciousCount: invisible.suspicious.length + homoglyphs.length,
  };
}
