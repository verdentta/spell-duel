import path from 'path';
import { Font } from '../types.js';
import { isCharacterInUnicodeRange } from './unicode.js';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function getRequiredFonts(svg: string, fonts: Font[]): string[] {
  const textNodes = svg.matchAll(/<text.*?>(.*?)<\/text>/gs);
  const requiredFonts = new Set<string>();

  if (!textNodes) {
    return [...requiredFonts];
  }

  for (const textNode of textNodes) {
    const text = textNode[1];

    char: for (const char of text) {
      for (const font of fonts) {
        for (const range of font.ranges) {
          if (isCharacterInUnicodeRange(char, range)) {
            requiredFonts.add(path.join(__dirname, '../../fonts', font.font));
            continue char;
          }
        }
      }
    }
  }

  return [...requiredFonts];
}
