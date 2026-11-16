import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { contentAccess } from './content-access';

// These aliases are used by older website editors. Check the hierarchy before
// handlers (including cached reads), just as the /content endpoints do.
export function installLessonAccess(app: FastifyInstance) {
  const access = contentAccess(app.prisma);
  app.addHook('onRoute', options => {
    if (!options.url.startsWith('/api/v1/lessons')) return;
    const guard = async (request: any, reply: any) => {
      const user = request.user;
      if (!user) return reply.code(401).send({ message: 'Sign in required' });
      const params = request.params || {};
      const body = request.body || {};
      const route = options.url;
      if (route === '/api/v1/lessons/reorder') {
        const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }).safeParse(body);
        if (!parsed.success) return reply.code(400).send({ message: 'Invalid lesson order' });
        for (const id of new Set(parsed.data.ids)) await access.lessonAccess(id, user);
      } else if (route === '/api/v1/lessons' || params.subjectId) {
        const subjectId = params.subjectId || body.subjectId;
        if (typeof subjectId !== 'string' || !subjectId) return reply.code(400).send({ message: 'Subject required' });
        await access.subjectAccess(subjectId, user);
      } else if (route.includes('/videos/:id')) {
        await access.videoAccess(params.id, user);
      } else if (route.includes('/notes/:id')) {
        await access.noteAccess(params.id, user);
      } else if (route.includes('/resources/:id')) {
        const resource = await app.prisma.resourceNode.findUnique({ where: { id: params.id }, select: { lessonId: true } });
        if (!resource) return reply.code(404).send({ message: 'Resource not found' });
        await access.lessonAccess(resource.lessonId, user);
      } else {
        await access.lessonAccess(params.lessonId || params.id, user);
      }
      if (params.lessonId && route.endsWith('/resources') && body.parentId) {
        if (typeof body.parentId !== 'string') return reply.code(400).send({ message: 'Invalid parent folder' });
        const folder = await app.prisma.resourceNode.findFirst({ where: { id: body.parentId, lessonId: params.lessonId, isFolder: true }, select: { id: true } });
        if (!folder) return reply.code(400).send({ message: 'Parent folder must belong to this lesson' });
      }
    };
    const pre = options.preHandler;
    options.preHandler = [...(Array.isArray(pre) ? pre : pre ? [pre] : []), guard];
  });
  app.addHook('onSend', async (request, reply, payload) => {
    if (request.method !== 'GET' && request.method !== 'HEAD' && reply.statusCode < 300) {
      app.cache.invalidatePrefix('lesson:');
      app.cache.invalidatePrefix('subject:');
    }
    return payload;
  });
}
