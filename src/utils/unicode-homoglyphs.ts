/**
 * Homoglyph (confusable) detection and normalisation.
 *
 * Two different questions are answered here, and conflating them is the classic bug:
 *
 * - **Confusables** ask "what does this character *look* like?". Cyrillic `о` and Latin `o` are
 *   visually identical but semantically distinct, and Unicode normalisation will never touch them.
 *   Substituting them blindly destroys genuine Russian or Greek text, so a substitution only
 *   happens inside a word that already contains ASCII Latin letters — `рaypal` is rewritten,
 *   `Привет` is left alone.
 * - **Styled Latin** asks "what does this character *mean*?". Fullwidth forms and the Mathematical
 *   Alphanumeric Symbols block are Latin letters wearing a costume, and their compatibility
 *   decomposition is exactly the plain letter. Those are safe to fold without word context, but
 *   they are a separate opt-in because folding them destroys intentional mathematical styling.
 *
 * The curated table below covers Cyrillic, Greek, Cherokee, Armenian and a handful of Latin
 * lookalikes. It is deliberately much smaller than the full UTS #39 `confusables.txt` (~6,500
 * entries): those extra entries are overwhelmingly exotic scripts that never appear in a homoglyph
 * attack on Latin text, and shipping them would cost bundle size while adding false positives.
 */

const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  У: 'Y',
  Х: 'X',
  Ѕ: 'S',
  І: 'I',
  Ј: 'J',
  Ү: 'Y',
  Ӏ: 'I',
  Ԍ: 'G',
  Ԛ: 'Q',
  Ԝ: 'W',
  а: 'a',
  в: 'b',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  і: 'i',
  ј: 'j',
  ԁ: 'd',
  һ: 'h',
  ѕ: 's',
  ԛ: 'q',
  ԝ: 'w',
  ɡ: 'g',

  // Greek
  Α: 'A',
  Β: 'B',
  Ε: 'E',
  Ζ: 'Z',
  Η: 'H',
  Ι: 'I',
  Κ: 'K',
  Μ: 'M',
  Ν: 'N',
  Ο: 'O',
  Ρ: 'P',
  Τ: 'T',
  Υ: 'Y',
  Χ: 'X',
  ο: 'o',
  ν: 'v',
  ρ: 'p',
  ϲ: 'c',
  Ϲ: 'C',
  ι: 'i',
  κ: 'k',
  τ: 't',
  υ: 'u',
  χ: 'x',
  γ: 'y',

  // Cherokee
  Ꭺ: 'A',
  Ᏼ: 'B',
  Ꮯ: 'C',
  Ꭰ: 'D',
  Ꭼ: 'E',
  Ꮐ: 'G',
  Ꮋ: 'H',
  Ꮖ: 'I',
  Ꭻ: 'J',
  Ꮶ: 'K',
  Ꮮ: 'L',
  Ꮇ: 'M',
  Ꮎ: 'N',
  Ꮲ: 'P',
  Ꮢ: 'R',
  Ꮪ: 'S',
  Ꭲ: 'T',
  Ꮙ: 'V',
  Ꮃ: 'W',
  Ꭹ: 'Y',
  Ꮓ: 'Z',

  // Armenian
  օ: 'o',
  ո: 'n',
  ս: 'u',
  գ: 'q',
  ա: 'w',
  հ: 'h',
  Ց: 'S',
  Ի: 'h',
  Ղ: 'n',
  Օ: 'O',

  // Latin and other lookalikes
  ǀ: 'l',
  ı: 'i',
  ȷ: 'j',
  ɑ: 'a',
  ɩ: 'i',
  ɪ: 'I',
  ʏ: 'Y',
  ʙ: 'B',
  ʜ: 'H',
  ʟ: 'L',
  ᴀ: 'A',
  ᴄ: 'C',
  ᴅ: 'D',
  ᴇ: 'E',
  ᴊ: 'J',
  ᴋ: 'K',
  ᴍ: 'M',
  ᴏ: 'O',
  ᴘ: 'P',
  ᴛ: 'T',
  ᴜ: 'U',
  ᴠ: 'V',
  ᴡ: 'W',
  ᴢ: 'Z',
  ⅰ: 'i',
  ⅴ: 'v',
  ⅹ: 'x',
  Ⅰ: 'I',
  Ⅴ: 'V',
  Ⅹ: 'X',
};

const RE_ASCII_LATIN_LETTER = /[A-Za-z]/;
const RE_WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;

export interface HomoglyphFinding {
  index: number
  char: string
  replacement: string
  label: string
  /** The word the character was found in, for display. */
  word: string
}

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

interface Word {
  text: string
  index: number
}

function splitWords(text: string): Word[] {
  const words: Word[] = [];
  let current = '';
  let start = 0;
  let index = 0;

  for (const char of text) {
    if (RE_WORD_CHARACTER.test(char)) {
      if (current === '') {
        start = index;
      }
      current += char;
    }
    else if (current !== '') {
      words.push({ text: current, index: start });
      current = '';
    }
    index += char.length;
  }

  if (current !== '') {
    words.push({ text: current, index: start });
  }

  return words;
}

/**
 * Find confusable characters that sit inside an otherwise-Latin word — the signature of a homoglyph
 * substitution. Words written entirely in another script are not reported.
 */
export function detectHomoglyphs(text: string): HomoglyphFinding[] {
  const findings: HomoglyphFinding[] = [];

  for (const word of splitWords(text)) {
    if (!RE_ASCII_LATIN_LETTER.test(word.text)) {
      continue;
    }

    let offset = 0;
    for (const char of word.text) {
      const replacement = CONFUSABLES[char];

      if (replacement) {
        findings.push({
          index: word.index + offset,
          char,
          replacement,
          label: formatCodePoint(char.codePointAt(0)!),
          word: word.text,
        });
      }
      offset += char.length;
    }
  }

  return findings;
}

/** Replace confusables with their Latin equivalent, only inside words that are already Latin. */
export function normaliseHomoglyphs(text: string): { text: string; findings: HomoglyphFinding[] } {
  const findings = detectHomoglyphs(text);

  if (findings.length === 0) {
    return { text, findings };
  }

  const replacements = new Map(findings.map(finding => [finding.index, finding.replacement]));
  let output = '';
  let index = 0;

  for (const char of text) {
    output += replacements.get(index) ?? char;
    index += char.length;
  }

  return { text: output, findings };
}

/**
 * Fullwidth forms and Mathematical Alphanumeric Symbols are Latin letters and digits with a
 * compatibility decomposition to the plain character. Only single-ASCII-character decompositions
 * are accepted, which keeps `℃`, `™` and `Ω` — whose decompositions are longer or non-ASCII — out.
 */
function isStyledLatin(codePoint: number): boolean {
  return (codePoint >= 0xFF10 && codePoint <= 0xFF19) // fullwidth digits
    || (codePoint >= 0xFF21 && codePoint <= 0xFF3A) // fullwidth uppercase
    || (codePoint >= 0xFF41 && codePoint <= 0xFF5A) // fullwidth lowercase
    || (codePoint >= 0x1D400 && codePoint <= 0x1D7FF) // mathematical alphanumerics
    || (codePoint >= 0x2102 && codePoint <= 0x2134); // letterlike symbols
}

export interface StyledLatinFinding {
  index: number
  char: string
  replacement: string
  label: string
}

export function normaliseStyledLatin(text: string): { text: string; findings: StyledLatinFinding[] } {
  const findings: StyledLatinFinding[] = [];
  let output = '';
  let index = 0;

  for (const char of text) {
    const codePoint = char.codePointAt(0)!;

    if (isStyledLatin(codePoint)) {
      const folded = char.normalize('NFKC');

      if (/^[A-Za-z0-9]$/.test(folded)) {
        findings.push({ index, char, replacement: folded, label: formatCodePoint(codePoint) });
        output += folded;
        index += char.length;
        continue;
      }
    }

    output += char;
    index += char.length;
  }

  return { text: output, findings };
}
