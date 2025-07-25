import { FastifyPluginAsync } from 'fastify';
import { generateAvatar } from '../avatarGenerator.js';

export const avatarRoute: FastifyPluginAsync = async (fastify) => {
	  fastify.get('/avatar', async (request, reply) => {
	  const query = request.query as { seed?: string; style?: string };

	  const seed = query.seed || 'default';
	  const style = query.style || 'pixelArtNeutral';

	  const svg = await generateAvatar(style, seed);

	  reply.type('image/svg+xml').send(svg); // svg is now raw markup
	});
};
