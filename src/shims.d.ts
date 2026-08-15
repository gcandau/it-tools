declare module '*.vue' {
  import type {  ComponentOptions } from 'vue';
  const Component: ComponentOptions;
  export default Component;
}

declare module '*.md' {
  import type {  ComponentOptions } from 'vue';
  const Component: ComponentOptions;
  export default Component;
}

declare module 'iarna-toml-esm' {
  export const parse: (toml: string) => any;
  export const stringify: (obj: any) => string;
}

declare module 'emojilib' {
  const lib: Record<string, string[]>;
  export default lib;
}

declare module 'unicode-emoji-json' {
  const emoji: Record<string, {
    name: string;
    slug: string;
    group: string;
    emoji_version: string;
    unicode_version: string;
    skin_tone_support: boolean;
    skin_tone_support_unicode_version: string;
  }>;
  
  export default emoji;
}

declare module 'pdf-signature-reader' {
  const verifySignature: (pdf: ArrayBuffer) => ({signatures: SignatureInfo[]});

  export default verifySignature;
}

// Packages used by ported tools that ship no type declarations of their own.

declare module 'morsee' {
  export const encode: (text: string) => string;
  export const decode: (morse: string) => string;
}

declare module 'punycode/' {
  export const toASCII: (input: string) => string;
  export const toUnicode: (input: string) => string;
  export const encode: (input: string) => string;
  export const decode: (input: string) => string;
}

declare module 'arr-diff' {
  const diff: <T>(one: T[], two: T[]) => T[];
  export default diff;
}

declare module 'hex-array' {
  export const toString: (bytes: Uint8Array, options?: { grouping?: number; rowLength?: number; uppercase?: boolean }) => string;
  export const fromString: (hex: string) => Uint8Array;
}

declare module 'generate-schema' {
  export const json: (title: string, object: any) => any;
  export const mysql: (title: string, object: any) => any;
  export const bigquery: (object: any) => any;
  export const mongoose: (object: any) => any;
}

declare module 'jsonlint-mod' {
  export const parse: (input: string) => any;
}

declare module 'fast_array_intersect' {
  const intersect: <T>(arrays: T[][], hash?: (value: T) => string | number) => T[];
  export default intersect;
}

declare module 'data-guardian' {
  export type SensitiveContentKey = string;
  export const maskString: (
    value: string,
    types?: SensitiveContentKey[] | null,
    options?: Record<string, unknown>,
    ...rest: unknown[]
  ) => string;
  export const maskData: (data: any, options?: Record<string, unknown>) => any;
}

declare module 'decomposerize' {
  const decomposerize: (composeFile: string, options?: Record<string, unknown>) => string;
  export default decomposerize;
}

declare module 'port-numbers' {
  /** Lookup table keyed by `<port>/<protocol>`; each entry is `[name, description]`. */
  const ports: Record<string, [string, string]>;
  export default ports;
}