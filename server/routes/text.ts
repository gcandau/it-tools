import slugify from '@sindresorhus/slugify';
import { format as formatSql } from 'sql-formatter';
import xmlFormat from 'xml-formatter';
import JSON5 from 'json5';
import { Netmask } from 'netmask';
import { extractIBAN, friendlyFormatIBAN, isQRIBAN, validateIBAN } from 'ibantools';
import { parsePhoneNumber } from 'libphonenumber-js';
import { booleanQuery, defineEndpoint, z } from '../endpoint';
import { badRequest, unprocessable } from '../errors';
import { getStringSizeInBytes } from '@/tools/text-statistics/text-statistics.service';
import { generateLoremIpsum } from '@/tools/lorem-ipsum-generator/lorem-ipsum-generator.service';
import { decodeJwt } from '@/tools/jwt-parser/jwt-parser.service';
import { getIPClass } from '@/tools/ipv4-subnet-calculator/ipv4-subnet-calculator.models';

export const textEndpoints = [
  defineEndpoint({
    id: 'slugify',
    method: 'post',
    path: 'text/slugify',
    tag: 'Text',
    summary: 'Turn a string into a URL-safe slug',
    input: z.object({ text: z.string(), separator: z.string().max(4).default('-') }),
    output: z.object({ slug: z.string() }),
    handler: ({ text, separator }) => ({ slug: slugify(text, { separator }) }),
  }),

  defineEndpoint({
    id: 'textStatistics',
    method: 'post',
    path: 'text/statistics',
    tag: 'Text',
    summary: 'Count characters, words, lines and bytes',
    input: z.object({ text: z.string() }),
    output: z.object({
      characterCount: z.number(),
      wordCount: z.number(),
      lineCount: z.number(),
      byteSize: z.number(),
    }),
    handler: ({ text }) => ({
      characterCount: text.length,
      wordCount: text === '' ? 0 : text.split(/\s+/).filter(Boolean).length,
      lineCount: text === '' ? 0 : text.split(/\r\n|\r|\n/).length,
      byteSize: getStringSizeInBytes(text),
    }),
  }),

  defineEndpoint({
    id: 'loremIpsum',
    method: 'get',
    path: 'generate/lorem-ipsum',
    tag: 'Text',
    summary: 'Generate lorem ipsum placeholder text',
    input: z.object({
      paragraphs: z.coerce.number().int().min(1).max(100).default(1),
      sentencesPerParagraph: z.coerce.number().int().min(1).max(50).default(3),
      words: z.coerce.number().int().min(1).max(100).default(10),
      startWithLoremIpsum: booleanQuery(true),
      html: booleanQuery(false),
    }),
    output: z.object({ text: z.string() }),
    handler: ({ paragraphs, sentencesPerParagraph, words, startWithLoremIpsum, html }) => ({
      text: generateLoremIpsum({
        paragraphCount: paragraphs,
        sentencePerParagraph: sentencesPerParagraph,
        wordCount: words,
        startWithLoremIpsum,
        asHTML: html,
      }),
    }),
  }),

  defineEndpoint({
    id: 'formatSql',
    method: 'post',
    path: 'format/sql',
    tag: 'Development',
    summary: 'Pretty-print a SQL query',
    input: z.object({
      sql: z.string(),
      dialect: z.enum([
        'sql', 'bigquery', 'db2', 'hive', 'mariadb', 'mysql', 'n1ql', 'plsql', 'postgresql',
        'redshift', 'singlestoredb', 'snowflake', 'spark', 'sqlite', 'transactsql', 'trino', 'tsql',
      ]).default('sql'),
      indent: z.coerce.number().int().min(1).max(8).default(2),
      keywordCase: z.enum(['preserve', 'upper', 'lower']).default('upper'),
    }),
    output: z.object({ sql: z.string() }),
    handler: ({ sql, dialect, indent, keywordCase }) => ({
      sql: formatSql(sql, {
        language: dialect as never,
        tabWidth: indent,
        keywordCase,
      }),
    }),
  }),

  defineEndpoint({
    id: 'formatXml',
    method: 'post',
    path: 'format/xml',
    tag: 'Development',
    summary: 'Pretty-print an XML document',
    input: z.object({
      xml: z.string(),
      indent: z.coerce.number().int().min(0).max(8).default(2),
      collapseContent: z.boolean().default(true),
    }),
    output: z.object({ xml: z.string() }),
    handler: ({ xml, indent, collapseContent }) => ({
      xml: xmlFormat(xml, { indentation: ' '.repeat(indent), collapseContent }),
    }),
  }),

  defineEndpoint({
    id: 'formatJson',
    method: 'post',
    path: 'format/json',
    tag: 'Development',
    summary: 'Pretty-print or minify JSON',
    input: z.object({
      json: z.string(),
      indent: z.coerce.number().int().min(0).max(8).default(2)
        .describe('Use 0 to minify.'),
      sortKeys: z.boolean().default(false),
    }),
    output: z.object({ json: z.string() }),
    handler: ({ json, indent, sortKeys }) => {
      let parsed: unknown;
      try {
        parsed = JSON5.parse(json);
      }
      catch (error) {
        throw badRequest(`Invalid JSON: ${(error as Error).message}`);
      }

      return {
        json: JSON.stringify(parsed, sortKeys ? sortedReplacer : undefined, indent),
      };
    },
  }),

  defineEndpoint({
    id: 'parseJwt',
    method: 'post',
    path: 'jwt/parse',
    tag: 'Web',
    summary: 'Decode a JSON Web Token',
    description: 'Decodes only. The signature is NOT verified — never trust these claims.',
    input: z.object({ jwt: z.string() }),
    output: z.object({
      header: z.array(z.object({
        claim: z.string(),
        value: z.string(),
        friendlyValue: z.string().optional(),
        claimDescription: z.string().optional(),
      })),
      payload: z.array(z.object({
        claim: z.string(),
        value: z.string(),
        friendlyValue: z.string().optional(),
        claimDescription: z.string().optional(),
      })),
    }),
    handler: ({ jwt }) => decodeJwt({ jwt }),
  }),

  defineEndpoint({
    id: 'parseUrl',
    method: 'post',
    path: 'url/parse',
    tag: 'Web',
    summary: 'Break a URL into its components',
    input: z.object({ url: z.string() }),
    output: z.object({
      protocol: z.string(),
      username: z.string(),
      password: z.string(),
      hostname: z.string(),
      port: z.string(),
      pathname: z.string(),
      search: z.string(),
      hash: z.string(),
      origin: z.string(),
      params: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
    handler: ({ url }) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      }
      catch {
        throw badRequest('Invalid URL.');
      }

      return {
        protocol: parsed.protocol,
        username: parsed.username,
        password: parsed.password,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        origin: parsed.origin,
        params: [...parsed.searchParams.entries()].map(([key, value]) => ({ key, value })),
      };
    },
  }),

  defineEndpoint({
    id: 'encodeUrl',
    method: 'post',
    path: 'url/encode',
    tag: 'Web',
    summary: 'Percent-encode or decode a string',
    input: z.object({
      text: z.string(),
      operation: z.enum(['encode', 'decode']).default('encode'),
      component: z.boolean().default(true)
        .describe('Use encodeURIComponent rather than encodeURI.'),
    }),
    output: z.object({ result: z.string() }),
    handler: ({ text, operation, component }) => {
      try {
        if (operation === 'encode') {
          return { result: component ? encodeURIComponent(text) : encodeURI(text) };
        }
        return { result: component ? decodeURIComponent(text) : decodeURI(text) };
      }
      catch {
        throw unprocessable('The input is not a valid percent-encoded string.');
      }
    },
  }),

  defineEndpoint({
    id: 'ipv4Subnet',
    method: 'get',
    path: 'network/ipv4-subnet',
    tag: 'Network',
    summary: 'Calculate an IPv4 subnet',
    input: z.object({ cidr: z.string().describe('For example 192.168.1.0/24') }),
    output: z.object({
      networkAddress: z.string(),
      firstAddress: z.string(),
      lastAddress: z.string(),
      broadcastAddress: z.string().nullable(),
      mask: z.string(),
      bitmask: z.number(),
      hostMask: z.string(),
      addressCount: z.number(),
      usableAddressCount: z.number(),
      ipClass: z.string().nullable(),
    }),
    handler: ({ cidr }) => {
      let block: Netmask;
      try {
        block = new Netmask(cidr);
      }
      catch (error) {
        throw badRequest(`Invalid CIDR block: ${(error as Error).message}`);
      }

      return {
        networkAddress: block.base,
        firstAddress: block.first,
        lastAddress: block.last,
        broadcastAddress: block.broadcast ?? null,
        mask: block.mask,
        bitmask: block.bitmask,
        hostMask: block.hostmask,
        addressCount: block.size,
        usableAddressCount: Math.max(0, block.size - 2),
        ipClass: getIPClass({ ip: block.base }) ?? null,
      };
    },
  }),

  defineEndpoint({
    id: 'validateIban',
    method: 'post',
    path: 'validate/iban',
    tag: 'Data',
    summary: 'Validate and parse an IBAN',
    input: z.object({ iban: z.string() }),
    output: z.object({
      isValid: z.boolean(),
      isQrIban: z.boolean(),
      countryCode: z.string().nullable(),
      bban: z.string().nullable(),
      friendlyFormat: z.string(),
    }),
    handler: ({ iban }) => {
      const normalised = iban.replace(/\s/g, '').toUpperCase();
      const validation = validateIBAN(normalised);
      const extracted = extractIBAN(normalised);

      return {
        isValid: validation.valid,
        isQrIban: isQRIBAN(normalised),
        countryCode: extracted.countryCode ?? null,
        bban: extracted.bban ?? null,
        friendlyFormat: friendlyFormatIBAN(normalised) ?? '',
      };
    },
  }),

  defineEndpoint({
    id: 'parsePhoneNumber',
    method: 'post',
    path: 'parse/phone',
    tag: 'Data',
    summary: 'Parse and format a phone number',
    input: z.object({
      phone: z.string(),
      country: z.string().length(2).optional().describe('ISO 3166-1 alpha-2, for national formats.'),
    }),
    output: z.object({
      isValid: z.boolean(),
      country: z.string().nullable(),
      countryCallingCode: z.string().nullable(),
      nationalNumber: z.string().nullable(),
      type: z.string().nullable(),
      international: z.string().nullable(),
      national: z.string().nullable(),
      uri: z.string().nullable(),
    }),
    handler: ({ phone, country }) => {
      try {
        const parsed = parsePhoneNumber(phone, country as never);

        return {
          isValid: parsed.isValid(),
          country: parsed.country ?? null,
          countryCallingCode: parsed.countryCallingCode ? String(parsed.countryCallingCode) : null,
          nationalNumber: parsed.nationalNumber ? String(parsed.nationalNumber) : null,
          type: parsed.getType() ?? null,
          international: parsed.formatInternational(),
          national: parsed.formatNational(),
          uri: parsed.getURI(),
        };
      }
      catch (error) {
        throw unprocessable(`Could not parse the phone number: ${(error as Error).message}`);
      }
    },
  }),
];

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
    );
  }

  return value;
}
