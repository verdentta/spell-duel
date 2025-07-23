import { createRequire } from 'module';
import path from 'path';
import woff2Rs from '@woff2/woff2-rs';
import { promises as fs, existsSync } from 'fs';
import { fileURLToPath } from 'node:url';

type Font = { font: string; ranges: [number, number][] };

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const TARGET_DIR = path.join(__dirname, '..', 'fonts');
const FONT_NAMESPACE = '@fontsource';
const FONT_PACKAGES = [
  'noto-sans',
  'noto-sans-thai',
  'noto-sans-jp',
  'noto-sans-kr',
  'noto-sans-sc',
];

if (!existsSync(TARGET_DIR)) {
  await fs.mkdir(TARGET_DIR, { recursive: true });
}

const fonts: Font[] = [];

for (const fontPackage of FONT_PACKAGES) {
  const fontPathTargetDir = path.join(TARGET_DIR, fontPackage);

  if (!existsSync(fontPathTargetDir)) {
    await fs.mkdir(fontPathTargetDir, { recursive: true });
  }

  await fs.copyFile(
    require
      .resolve(`${FONT_NAMESPACE}/${fontPackage}/index.css`)
      .replace('index.css', 'LICENSE'),
    path.join(fontPathTargetDir, 'LICENSE'),
  );

  const unicodeMetadata: Record<string, string> = (
    await import(`${FONT_NAMESPACE}/${fontPackage}/unicode.json`, {
      with: { type: 'json' },
    })
  ).default;

  for (const [subset, ranges] of Object.entries(unicodeMetadata)) {
    const parsedRanges: [number, number][] = [];

    for (const range of ranges.split(',')) {
      if (range.includes('-')) {
        const [start, end] = range.split('-');

        const parsedStart = parseInt(start.replace('U+', ''), 16);
        const parsedEnd = parseInt(end.replace('U+', ''), 16);

        parsedRanges.push([parsedStart, parsedEnd]);

        continue;
      }

      const parsedStart = parseInt(range.replace('U+', ''), 16);
      const parsedEnd = parsedStart;

      parsedRanges.push([parsedStart, parsedEnd]);
    }

    const subsetName = subset.replace(/[\[\]]/g, '');

    const fontPathSource = require.resolve(
      `${FONT_NAMESPACE}/${fontPackage}/files/${fontPackage}-${subsetName}-400-normal.woff2`,
    );

    const fontFileName = path.basename(fontPathSource, '.woff2') + '.ttf';
    const fontPathTarget = path.join(fontPathTargetDir, fontFileName);

    const fontInputBuffer = await fs.readFile(require.resolve(fontPathSource));
    const fontOutputBuffer = woff2Rs.decode(fontInputBuffer);

    await fs.writeFile(fontPathTarget, fontOutputBuffer);

    fonts.push({
      font: `${fontPackage}/${fontFileName}`,
      ranges: parsedRanges,
    });
  }
}

await fs.writeFile(
  path.join(TARGET_DIR, 'fonts.json'),
  JSON.stringify(fonts, null, 2),
);
