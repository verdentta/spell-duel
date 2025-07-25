import { avatarRoute } from './routes/avatar.js';
import { config } from './config.js';
import fastify from 'fastify';
import cors from '@fastify/cors';

import { parseQueryString } from './utils/query-string.js';
import { versionRoutes } from './routes/version.js';
import { getVersions } from './utils/versions.js';
import { Font } from './types.js';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import * as path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export const app = async () => {
  const app = fastify({
    logger: config.logger,
    querystringParser: (str) => parseQueryString(str),
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: true,
        useDefaults: false,
      },
    },
    maxParamLength: 1024,
  });

  const fonts = JSON.parse(
    await fs.readFile(path.join(__dirname, '../fonts/fonts.json'), 'utf-8')
  ) as Font[];

  app.decorate('fonts', fonts);

  await app.register(cors);

  await app.register(versionRoutes, { versions: await getVersions() });
  await app.register(avatarRoute);

  return app;
};
