import { createAvatar } from '@dicebear/core';
import {
  pixelArtNeutral,
  botttsNeutral,
  adventurer,
  avataaars,
  loreleiNeutral,
  funEmoji,
  croodles,
  micah,
  lorelei,
  bottts,
  dylan,
  glass,
  icons,
  notionists,
  personas,
  rings,
  shapes,
  thumbs
} from '@dicebear/collection';

const avatarStyles = {
  pixelArtNeutral,
  botttsNeutral,
  adventurer,
  avataaars,
  loreleiNeutral,
  funEmoji,
  croodles,
  micah,
  lorelei,
  bottts,
  dylan,
  glass,
  icons,
  notionists,
  personas,
  rings,
  shapes,
  thumbs
};

export async function generateAvatar(style: string, seed: string): Promise<string> {
  const selectedStyle = avatarStyles[style as keyof typeof avatarStyles] || pixelArtNeutral;
  const avatar = createAvatar(selectedStyle as any, { seed });

  return await avatar.toString(); // raw <svg> content
}
