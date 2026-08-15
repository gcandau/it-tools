export { convertTextToAsciiBinary, convertAsciiBinaryToText };

/**
 * Text is encoded as UTF-8 before being written out in binary.
 *
 * Reading `charCodeAt` per character instead would emit UTF-16 code units: any character above
 * U+00FF produces more than eight bits, which breaks the octet grouping and makes the result
 * impossible to decode back. Emoji fare worse still, since `split('')` tears surrogate pairs apart.
 */
function convertTextToAsciiBinary(text: string, { separator = ' ' }: { separator?: string } = {}): string {
  return [...new TextEncoder().encode(text)]
    .map(byte => byte.toString(2).padStart(8, '0'))
    .join(separator);
}

function convertAsciiBinaryToText(binary: string): string {
  const cleanBinary = binary.replace(/[^01]/g, '');

  if (cleanBinary.length % 8) {
    throw new Error('Invalid binary string');
  }

  const bytes = Uint8Array.from(
    cleanBinary.match(/.{8}/g) ?? [],
    octet => Number.parseInt(octet, 2),
  );

  return new TextDecoder().decode(bytes);
}
