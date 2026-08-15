import { defineEndpoint, z } from '../endpoint';
import {
  analyseText,
  cleanText,
  defaultCleaningOptions,
} from '@/tools/ai-watermark-remover/ai-watermark-remover.service';
import { detectAiText } from '@/tools/ai-text-detector/ai-text-detector.service';

const textInput = z.string().openapi({ example: 'The text to process.' });

const cleaningOptions = z.object({
  invisible: z.boolean().optional().describe('Strip invisible and zero-width characters.'),
  mode: z.enum(['safe', 'aggressive']).optional()
    .describe('safe keeps contextually legitimate characters (emoji joiners, Persian ZWNJ, emoji flags); aggressive removes everything and will corrupt such text.'),
  homoglyphs: z.boolean().optional().describe('Fold Cyrillic/Greek lookalikes to Latin inside Latin words.'),
  styledLatin: z.boolean().optional().describe('Fold fullwidth and mathematical alphanumerics to ASCII.'),
  typography: z.boolean().optional().describe('Fold smart quotes, dashes, ellipses and exotic spaces.'),
  emDash: z.enum(['keep', 'hyphen', 'double-hyphen', 'spaced-hyphen']).optional()
    .describe('What to do with em dashes. Defaults to keep: an em dash is a style choice, not a marker.'),
  whitespace: z.boolean().optional().describe('Collapse repeated spaces and trim line ends.'),
}).optional();

const findingSchema = z.object({
  index: z.number(),
  codePoint: z.number(),
  label: z.string(),
  name: z.string(),
  class: z.string(),
  severity: z.string(),
  reason: z.string().optional(),
});

export const aiEndpoints = [
  defineEndpoint({
    id: 'removeAiWatermark',
    method: 'post',
    path: 'ai/watermark/remove',
    tag: 'AI',
    summary: 'Remove invisible characters, hidden payloads and homoglyphs from a text',
    description:
      'Removes character-level markers exactly and verifiably: zero-width characters, Unicode '
      + 'Tags-block payloads, the variation-selector byte channel, bidirectional controls, homoglyph '
      + 'substitutions and non-ASCII typography. It cannot remove statistical watermarks such as '
      + 'SynthID-Text or the marking Anthropic began applying on 2 August 2026 — those are embedded '
      + 'in token choice, not in any character, and survive every transformation this endpoint makes.',
    input: z.object({ text: textInput, options: cleaningOptions }),
    output: z.object({
      text: z.string(),
      removed: z.array(z.object({
        label: z.string(),
        name: z.string(),
        class: z.string(),
        count: z.number(),
      })),
      rewritten: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string(),
        kind: z.string(),
        count: z.number(),
      })),
      hiddenPayloads: z.array(z.object({
        encoding: z.string(),
        text: z.string(),
        index: z.number(),
      })),
      stats: z.object({
        inputLength: z.number(),
        outputLength: z.number(),
        charactersRemoved: z.number(),
        charactersRewritten: z.number(),
      }),
      changed: z.boolean(),
    }),
    handler: ({ text, options }) => {
      const report = cleanText(text, { ...defaultCleaningOptions, ...options });
      const { invisible } = analyseText(text);

      return {
        text: report.text,
        removed: groupBy(
          report.invisibleRemoved,
          finding => finding.label,
          finding => ({ label: finding.label, name: finding.name, class: finding.class }),
        ),
        rewritten: groupBy(
          [
            ...report.homoglyphsReplaced.map(finding => ({
              from: finding.char,
              to: finding.replacement,
              label: finding.label,
              kind: 'homoglyph',
            })),
            ...report.styledLatinFolded.map(finding => ({
              from: finding.char,
              to: finding.replacement,
              label: finding.label,
              kind: 'styled-latin',
            })),
            ...report.typographyChanged.map(finding => ({
              from: finding.char,
              to: finding.replacement,
              label: finding.label,
              kind: finding.category,
            })),
          ],
          item => `${item.label}:${item.to}`,
          item => item,
        ),
        hiddenPayloads: invisible.payloads.map(payload => ({
          encoding: payload.encoding,
          text: payload.text,
          index: payload.index,
        })),
        stats: report.stats,
        changed: report.changed,
      };
    },
  }),

  defineEndpoint({
    id: 'detectAiWatermark',
    method: 'post',
    path: 'ai/watermark/detect',
    tag: 'AI',
    summary: 'Report invisible characters and hidden payloads without modifying the text',
    input: z.object({ text: textInput }),
    output: z.object({
      suspiciousCount: z.number(),
      hasHiddenPayload: z.boolean(),
      findings: z.array(findingSchema),
      keptFindings: z.array(findingSchema),
      payloads: z.array(z.object({ encoding: z.string(), text: z.string(), index: z.number() })),
      homoglyphs: z.array(z.object({
        index: z.number(),
        char: z.string(),
        replacement: z.string(),
        label: z.string(),
        word: z.string(),
      })),
      longestZeroWidthRun: z.number(),
    }),
    handler: ({ text }) => {
      const analysis = analyseText(text);

      return {
        suspiciousCount: analysis.suspiciousCount,
        hasHiddenPayload: analysis.hasHiddenPayload,
        findings: analysis.invisible.suspicious,
        keptFindings: analysis.invisible.findings.filter(finding => finding.severity === 'none'),
        payloads: analysis.invisible.payloads.map(payload => ({
          encoding: payload.encoding,
          text: payload.text,
          index: payload.index,
        })),
        homoglyphs: analysis.homoglyphs,
        longestZeroWidthRun: analysis.invisible.longestZeroWidthRun,
      };
    },
  }),

  defineEndpoint({
    id: 'detectAiText',
    method: 'post',
    path: 'ai/detect',
    tag: 'AI',
    summary: 'Analyse a text for hidden AI markers and stylistic signals',
    description:
      'Returns two tiers of evidence. Hard evidence (hidden characters, chat interface residue) is '
      + 'precise. Stylometry is a description of writing style and nothing more: published '
      + 'false-positive rates for detectors of this kind reach 61% on non-native English writing '
      + '(Liang et al., Patterns, 2023). Style scoring is refused below 300 words. Do not use this '
      + 'response as evidence in any consequential decision.',
    input: z.object({ text: textInput }),
    output: z.object({
      wordCount: z.number(),
      sentenceCount: z.number(),
      scorable: z.boolean(),
      isEnglish: z.boolean(),
      verdict: z.object({ band: z.string(), label: z.string(), summary: z.string() }),
      hardEvidence: z.array(z.object({
        id: z.string(),
        label: z.string(),
        reliability: z.string(),
        score: z.number(),
        detail: z.string(),
        evidence: z.array(z.string()),
      })),
      stylometry: z.array(z.object({
        id: z.string(),
        label: z.string(),
        reliability: z.string(),
        score: z.number(),
        detail: z.string(),
        evidence: z.array(z.string()),
      })),
      disclaimer: z.string(),
    }),
    handler: ({ text }) => {
      const result = detectAiText(text);

      return {
        wordCount: result.wordCount,
        sentenceCount: result.sentenceCount,
        scorable: result.scorable,
        isEnglish: result.isEnglish,
        verdict: result.verdict,
        hardEvidence: result.hardEvidence,
        stylometry: result.stylometry,
        disclaimer:
          'This is a style analyser, not evidence. It does not run a language model and cannot '
          + 'detect statistical watermarks. Never use it to accuse anyone.',
      };
    },
  }),
];

function groupBy<TItem, TShape extends object>(
  items: TItem[],
  key: (item: TItem) => string,
  shape: (item: TItem) => TShape,
): (TShape & { count: number })[] {
  const grouped = new Map<string, TShape & { count: number }>();

  for (const item of items) {
    const identity = key(item);
    const existing = grouped.get(identity);

    if (existing) {
      existing.count++;
    }
    else {
      grouped.set(identity, { ...shape(item), count: 1 });
    }
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count);
}
