// api/index.ts — Serverless Fastify API Entry
import { createFastifyApp } from '../apps/api/src/fastify/server';

let fastifyApp: any = null;

export default async function handler(req: any, res: any) {
  if (!fastifyApp) {
    fastifyApp = await createFastifyApp();
    await fastifyApp.ready();
  }
  fastifyApp.server.emit('request', req, res);
}
