/**
 * Conversion is done per code point, not per UTF-16 code unit.
 *
 * `split('')` and `charCodeAt` tear surrogate pairs in half, so any character outside the Basic
 * Multilingual Plane — every emoji, most historic scripts, the mathematical alphabets — would be
 * emitted as two meaningless entities that decode back to broken text.
 */
function convertTextToUnicode(text: string): string {
  return [...text].map(character => `&#${character.codePointAt(0)};`).join('');
}

function convertUnicodeToText(unicodeStr: string): string {
  return unicodeStr.replace(
    /&#(\d+);/g,
    (_match, decimal) => String.fromCodePoint(Number(decimal)),
  );
}

export { convertTextToUnicode, convertUnicodeToText };
