import { HmacMD5, HmacRIPEMD160, HmacSHA1, HmacSHA224, HmacSHA256, HmacSHA3, HmacSHA384, HmacSHA512, enc } from 'crypto-js';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';
import { NIL as uuidNil, v1 as uuidV1, v3 as uuidV3, v4 as uuidV4, v5 as uuidV5, v6 as uuidV6, v7 as uuidV7 } from 'uuid';
import { booleanQuery, defineEndpoint, z } from '../endpoint';
import { badRequest } from '../errors';
import {
  type DigestEncoding,
  type HashAlgorithm,
  digestEncodings,
  hashAlgorithmNames,
  hashText,
  hashTextWithAllAlgorithms,
} from '@/tools/hash-text/hash-text.service';
import { createToken } from '@/tools/token-generator/token-generator.service';
import { getPasswordCrackTimeEstimation } from '@/tools/password-strength-analyser/password-strength-analyser.service';

const hmacAlgorithms = {
  MD5: HmacMD5,
  SHA1: HmacSHA1,
  SHA224: HmacSHA224,
  SHA256: HmacSHA256,
  SHA384: HmacSHA384,
  SHA512: HmacSHA512,
  SHA3: HmacSHA3,
  RIPEMD160: HmacRIPEMD160,
} as const;

const encodingSchema = z.enum(digestEncodings as [DigestEncoding, ...DigestEncoding[]]).optional();
const algorithmSchema = z.enum(hashAlgorithmNames as [HashAlgorithm, ...HashAlgorithm[]]);

export const cryptoEndpoints = [
  defineEndpoint({
    id: 'hashText',
    method: 'post',
    path: 'hash',
    tag: 'Crypto',
    summary: 'Hash a text with one algorithm, or with all of them at once',
    input: z.object({
      text: z.string(),
      algorithm: algorithmSchema.optional().describe('Omit to receive every digest.'),
      encoding: encodingSchema.describe('Defaults to Hex.'),
    }),
    output: z.object({ digests: z.record(z.string()) }),
    handler: ({ text, algorithm, encoding = 'Hex' }) => ({
      digests: algorithm
        ? { [algorithm]: hashText({ algorithm, text, encoding }) }
        : hashTextWithAllAlgorithms({ text, encoding }),
    }),
  }),

  defineEndpoint({
    id: 'hmac',
    method: 'post',
    path: 'hmac',
    tag: 'Crypto',
    summary: 'Compute an HMAC',
    input: z.object({
      text: z.string(),
      key: z.string(),
      algorithm: z.enum(['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160']).default('SHA256'),
      encoding: encodingSchema,
    }),
    output: z.object({ hmac: z.string() }),
    handler: ({ text, key, algorithm, encoding = 'Hex' }) => {
      const digest = hmacAlgorithms[algorithm](text, key);
      const encoded = encoding === 'Bin'
        ? digest.toString(enc.Hex).split('').map(char => Number.parseInt(char, 16).toString(2).padStart(4, '0')).join('')
        : digest.toString(enc[encoding]);

      return { hmac: encoded };
    },
  }),

  defineEndpoint({
    id: 'bcryptHash',
    method: 'post',
    path: 'bcrypt/hash',
    tag: 'Crypto',
    summary: 'Hash a string with bcrypt',
    input: z.object({
      text: z.string(),
      saltRounds: z.number().int().min(4).max(15).default(10)
        .describe('Capped at 15: higher values take seconds and would time out the function.'),
    }),
    output: z.object({ hash: z.string() }),
    handler: ({ text, saltRounds }) => ({ hash: bcrypt.hashSync(text, saltRounds) }),
  }),

  defineEndpoint({
    id: 'bcryptCompare',
    method: 'post',
    path: 'bcrypt/compare',
    tag: 'Crypto',
    summary: 'Check a string against a bcrypt hash',
    input: z.object({ text: z.string(), hash: z.string() }),
    output: z.object({ matches: z.boolean() }),
    handler: ({ text, hash }) => {
      try {
        return { matches: bcrypt.compareSync(text, hash) };
      }
      catch {
        // bcryptjs throws on a malformed hash rather than returning false.
        return { matches: false };
      }
    },
  }),

  defineEndpoint({
    id: 'generateToken',
    method: 'get',
    path: 'generate/token',
    tag: 'Crypto',
    summary: 'Generate a random token',
    input: z.object({
      length: z.coerce.number().int().min(1).max(512).default(64),
      uppercase: booleanQuery(true),
      lowercase: booleanQuery(true),
      numbers: booleanQuery(true),
      symbols: booleanQuery(false),
    }),
    output: z.object({ token: z.string() }),
    handler: ({ length, uppercase, lowercase, numbers, symbols }) => {
      if (!uppercase && !lowercase && !numbers && !symbols) {
        throw badRequest('At least one character class must be enabled.');
      }

      return {
        token: createToken({
          length,
          withUppercase: uppercase,
          withLowercase: lowercase,
          withNumbers: numbers,
          withSymbols: symbols,
        }),
      };
    },
  }),

  defineEndpoint({
    id: 'generateUuid',
    method: 'get',
    path: 'generate/uuid',
    tag: 'Crypto',
    summary: 'Generate one or more UUIDs',
    input: z.object({
      version: z.enum(['nil', 'v1', 'v3', 'v4', 'v5', 'v6', 'v7']).default('v4'),
      count: z.coerce.number().int().min(1).max(100).default(1),
      namespace: z.string().optional().describe('Required for v3 and v5.'),
      name: z.string().optional().describe('Required for v3 and v5.'),
    }),
    output: z.object({ uuids: z.array(z.string()) }),
    handler: ({ version, count, namespace, name }) => {
      const generate = () => {
        if (version === 'nil') {
          return uuidNil;
        }
        if (version === 'v1') {
          return uuidV1();
        }
        if (version === 'v4') {
          return uuidV4();
        }
        if (version === 'v6') {
          return uuidV6();
        }
        if (version === 'v7') {
          return uuidV7();
        }

        if (!namespace || name === undefined) {
          throw badRequest(`UUID ${version} requires both "namespace" and "name".`);
        }

        return version === 'v3' ? uuidV3(name, namespace) : uuidV5(name, namespace);
      };

      return { uuids: Array.from({ length: count }, generate) };
    },
  }),

  defineEndpoint({
    id: 'generateUlid',
    method: 'get',
    path: 'generate/ulid',
    tag: 'Crypto',
    summary: 'Generate one or more ULIDs',
    input: z.object({ count: z.coerce.number().int().min(1).max(100).default(1) }),
    output: z.object({ ulids: z.array(z.string()) }),
    handler: ({ count }) => ({ ulids: Array.from({ length: count }, () => ulid()) }),
  }),

  defineEndpoint({
    id: 'analysePasswordStrength',
    method: 'post',
    path: 'password-strength',
    tag: 'Crypto',
    summary: 'Estimate brute-force crack time for a password',
    description:
      'Entropy-based estimate only. It does not model dictionary or credential-stuffing attacks, so '
      + 'a high score is not a guarantee the password is safe.',
    input: z.object({ password: z.string() }),
    output: z.object({
      entropy: z.number(),
      score: z.number(),
      passwordLength: z.number(),
      charsetLength: z.number(),
      crackDurationFormatted: z.string(),
      secondsToCrack: z.number(),
    }),
    handler: ({ password }) => getPasswordCrackTimeEstimation({ password }),
  }),
];
