import type { lib } from 'crypto-js';
import { MD5, RIPEMD160, SHA1, SHA224, SHA256, SHA3, SHA384, SHA512, enc } from 'crypto-js';

export function convertHexToBin(hex: string) {
  return hex
    .trim()
    .split('')
    .map(byte => Number.parseInt(byte, 16).toString(2).padStart(4, '0'))
    .join('');
}

/**
 * SHA3 defaults to a 512-bit digest in crypto-js, so the shorter Keccak output sizes are exposed
 * explicitly rather than leaving callers to guess which one they got.
 */
export const hashAlgorithms = {
  MD5,
  SHA1,
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA3,
  'SHA3-224': (message: string) => SHA3(message, { outputLength: 224 }),
  'SHA3-256': (message: string) => SHA3(message, { outputLength: 256 }),
  'SHA3-384': (message: string) => SHA3(message, { outputLength: 384 }),
  'SHA3-512': (message: string) => SHA3(message, { outputLength: 512 }),
  RIPEMD160,
} as const;

export type HashAlgorithm = keyof typeof hashAlgorithms;
export type DigestEncoding = 'Bin' | 'Hex' | 'Base64' | 'Base64url';

export const hashAlgorithmNames = Object.keys(hashAlgorithms) as HashAlgorithm[];
export const digestEncodings: DigestEncoding[] = ['Bin', 'Hex', 'Base64', 'Base64url'];

export function formatWithEncoding(words: lib.WordArray, encoding: DigestEncoding) {
  if (encoding === 'Bin') {
    return convertHexToBin(words.toString(enc.Hex));
  }

  return words.toString(enc[encoding]);
}

export function hashText({
  algorithm,
  text,
  encoding = 'Hex',
}: {
  algorithm: HashAlgorithm
  text: string
  encoding?: DigestEncoding
}) {
  return formatWithEncoding(hashAlgorithms[algorithm](text), encoding);
}

/** Every digest at once — what the tool page shows, and what `POST /api/v1/hash` returns. */
export function hashTextWithAllAlgorithms({
  text,
  encoding = 'Hex',
}: {
  text: string
  encoding?: DigestEncoding
}): Record<HashAlgorithm, string> {
  return Object.fromEntries(
    hashAlgorithmNames.map(algorithm => [algorithm, hashText({ algorithm, text, encoding })]),
  ) as Record<HashAlgorithm, string>;
}
