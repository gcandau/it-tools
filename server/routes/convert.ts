// smol-toml rather than the iarna-toml-esm used by the SPA tools: that package declares itself
// CommonJS but ships ES modules, which breaks under Node and in a serverless bundle.
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import JSON5 from 'json5';
import { js2xml, xml2js } from 'xml-js';
import { marked } from 'marked';
import {
  camelCase,
  capitalCase,
  constantCase,
  dotCase,
  headerCase,
  noCase,
  paramCase,
  pascalCase,
  pathCase,
  sentenceCase,
  snakeCase,
} from 'change-case';
import { defineEndpoint, z } from '../endpoint';
import { badRequest } from '../errors';
import { base64ToText, textToBase64 } from '@/utils/base64';
import { arabicToRoman, romanToArabic } from '@/tools/roman-numeral-converter/roman-numeral-converter.service';
import { convertAsciiBinaryToText, convertTextToAsciiBinary } from '@/tools/text-to-binary/text-to-binary.models';
import { textToNatoAlphabet } from '@/tools/text-to-nato-alphabet/text-to-nato-alphabet.service';

const caseConverters = {
  camel: camelCase,
  capital: capitalCase,
  constant: constantCase,
  dot: dotCase,
  header: headerCase,
  no: noCase,
  param: paramCase,
  pascal: pascalCase,
  path: pathCase,
  sentence: sentenceCase,
  snake: snakeCase,
  lower: (value: string) => value.toLowerCase(),
  upper: (value: string) => value.toUpperCase(),
} as const;

/** JSON5 is used for input so the endpoints accept the same relaxed syntax the web tools do. */
function parseJson(value: string): unknown {
  try {
    return JSON5.parse(value);
  }
  catch (error) {
    throw badRequest(`Invalid JSON: ${(error as Error).message}`);
  }
}

const indentOption = z.coerce.number().int().min(0).max(8).default(2);

export const convertEndpoints = [
  defineEndpoint({
    id: 'encodeBase64',
    method: 'post',
    path: 'convert/base64/encode',
    tag: 'Converter',
    summary: 'Encode a text to base64',
    input: z.object({ text: z.string(), urlSafe: z.boolean().default(false) }),
    output: z.object({ base64: z.string() }),
    handler: ({ text, urlSafe }) => ({ base64: textToBase64(text, { makeUrlSafe: urlSafe }) }),
  }),

  defineEndpoint({
    id: 'decodeBase64',
    method: 'post',
    path: 'convert/base64/decode',
    tag: 'Converter',
    summary: 'Decode a base64 string',
    input: z.object({ base64: z.string(), urlSafe: z.boolean().default(false) }),
    output: z.object({ text: z.string() }),
    handler: ({ base64, urlSafe }) => ({ text: base64ToText(base64, { makeUrlSafe: urlSafe }) }),
  }),

  defineEndpoint({
    id: 'jsonToYaml',
    method: 'post',
    path: 'convert/json-to-yaml',
    tag: 'Converter',
    summary: 'Convert JSON to YAML',
    input: z.object({ json: z.string() }),
    output: z.object({ yaml: z.string() }),
    handler: ({ json }) => ({ yaml: stringifyYaml(parseJson(json)) }),
  }),

  defineEndpoint({
    id: 'yamlToJson',
    method: 'post',
    path: 'convert/yaml-to-json',
    tag: 'Converter',
    summary: 'Convert YAML to JSON',
    input: z.object({ yaml: z.string(), indent: indentOption }),
    output: z.object({ json: z.string() }),
    handler: ({ yaml, indent }) => ({ json: JSON.stringify(parseYaml(yaml), null, indent) }),
  }),

  defineEndpoint({
    id: 'jsonToToml',
    method: 'post',
    path: 'convert/json-to-toml',
    tag: 'Converter',
    summary: 'Convert JSON to TOML',
    input: z.object({ json: z.string() }),
    output: z.object({ toml: z.string() }),
    handler: ({ json }) => ({ toml: stringifyToml(parseJson(json) as never) }),
  }),

  defineEndpoint({
    id: 'tomlToJson',
    method: 'post',
    path: 'convert/toml-to-json',
    tag: 'Converter',
    summary: 'Convert TOML to JSON',
    input: z.object({ toml: z.string(), indent: indentOption }),
    output: z.object({ json: z.string() }),
    handler: ({ toml, indent }) => ({ json: JSON.stringify(parseToml(toml), null, indent) }),
  }),

  defineEndpoint({
    id: 'jsonToXml',
    method: 'post',
    path: 'convert/json-to-xml',
    tag: 'Converter',
    summary: 'Convert JSON to XML',
    input: z.object({ json: z.string(), indent: indentOption }),
    output: z.object({ xml: z.string() }),
    handler: ({ json, indent }) => ({
      xml: js2xml(parseJson(json) as never, { compact: true, spaces: indent }),
    }),
  }),

  defineEndpoint({
    id: 'xmlToJson',
    method: 'post',
    path: 'convert/xml-to-json',
    tag: 'Converter',
    summary: 'Convert XML to JSON',
    input: z.object({ xml: z.string(), indent: indentOption }),
    output: z.object({ json: z.string() }),
    handler: ({ xml, indent }) => ({
      json: JSON.stringify(xml2js(xml, { compact: true }), null, indent),
    }),
  }),

  defineEndpoint({
    id: 'markdownToHtml',
    method: 'post',
    path: 'convert/markdown-to-html',
    tag: 'Converter',
    summary: 'Render Markdown to HTML',
    description: 'The HTML is not sanitised. Sanitise it yourself before inserting it into a page.',
    input: z.object({ markdown: z.string() }),
    output: z.object({ html: z.string() }),
    handler: async ({ markdown }) => ({ html: await marked(markdown) }),
  }),

  defineEndpoint({
    id: 'convertCase',
    method: 'post',
    path: 'convert/case',
    tag: 'Converter',
    summary: 'Convert a string between naming cases',
    input: z.object({
      text: z.string(),
      target: z.enum([
        'camel', 'capital', 'constant', 'dot', 'header', 'no', 'param', 'pascal', 'path',
        'sentence', 'snake', 'lower', 'upper',
      ]).optional().describe('Omit to receive every case at once.'),
    }),
    output: z.object({ results: z.record(z.string()) }),
    handler: ({ text, target }) => ({
      results: target
        ? { [target]: caseConverters[target](text) }
        : Object.fromEntries(
          Object.entries(caseConverters).map(([name, convert]) => [name, convert(text)]),
        ),
    }),
  }),

  defineEndpoint({
    id: 'romanNumerals',
    method: 'get',
    path: 'convert/roman-numeral',
    tag: 'Converter',
    summary: 'Convert between Arabic and Roman numerals',
    input: z.object({
      arabic: z.coerce.number().int().min(1).max(3999).optional(),
      roman: z.string().optional(),
    }),
    output: z.object({ arabic: z.number().nullable(), roman: z.string().nullable() }),
    handler: ({ arabic, roman }) => {
      if (arabic !== undefined) {
        return { arabic, roman: arabicToRoman(arabic) ?? null };
      }
      if (roman) {
        return { arabic: romanToArabic(roman.toUpperCase()) ?? null, roman: roman.toUpperCase() };
      }

      throw badRequest('Provide either "arabic" or "roman".');
    },
  }),

  defineEndpoint({
    id: 'textToBinary',
    method: 'post',
    path: 'convert/text-to-binary',
    tag: 'Converter',
    summary: 'Convert text to its ASCII binary representation',
    input: z.object({ text: z.string(), separator: z.string().default(' ') }),
    output: z.object({ binary: z.string() }),
    handler: ({ text, separator }) => ({ binary: convertTextToAsciiBinary(text, { separator }) }),
  }),

  defineEndpoint({
    id: 'binaryToText',
    method: 'post',
    path: 'convert/binary-to-text',
    tag: 'Converter',
    summary: 'Convert an ASCII binary string back to text',
    input: z.object({ binary: z.string() }),
    output: z.object({ text: z.string() }),
    handler: ({ binary }) => ({ text: convertAsciiBinaryToText(binary) }),
  }),

  defineEndpoint({
    id: 'textToNato',
    method: 'post',
    path: 'convert/nato-alphabet',
    tag: 'Converter',
    summary: 'Spell a text using the NATO phonetic alphabet',
    input: z.object({ text: z.string() }),
    output: z.object({ nato: z.string() }),
    handler: ({ text }) => ({ nato: textToNatoAlphabet({ text }) }),
  }),
];
