import 'reflect-metadata';

function setCorsHeaders(req: any, res: any) {
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  );
  res.setHeader('Vary', 'Origin');
}

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../apps/api/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express, { Express } from 'express';

const server: Express = express();
let isInitialized = false;
let initError: Error | null = null;

async function createNestServer(expressInstance: Express) {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance), {
    logger: ['error', 'warn'],
  });

  expressInstance.use(express.json({ limit: '25mb' }));
  expressInstance.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (origin: any, callback: any) => callback(null, origin || true),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
}

export default async function handler(req: any, res: any) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url;
  if (typeof originalPath === 'string' && originalPath !== '/api' && originalPath !== '/api/') {
    req.url = originalPath;
  }

  if (req.url && !req.url.startsWith('/api/v1')) {
    req.url = '/api/v1' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  if (!isInitialized && !initError) {
    try {
      await createNestServer(server);
      isInitialized = true;
    } catch (err: any) {
      initError = err;
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          statusCode: 503,
          message: `Boot failed: ${err?.message || 'Unknown error'}`,
          error: 'Service Unavailable',
        }),
      );
    }
  }

  if (initError) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        statusCode: 503,
        message: `Boot failed: ${initError.message}`,
        error: 'Service Unavailable',
      }),
    );
  }

  server(req, res);
}
