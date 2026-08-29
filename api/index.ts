import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../apps/api/src/app.module';
import { ValidationPipe } from '@nestjs/common';
import express, { Express } from 'express';

const server: Express = express();
let isInitialized = false;

async function createNestServer(expressInstance: Express) {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressInstance));

  expressInstance.use(express.json({ limit: '25mb' }));
  expressInstance.use(express.urlencoded({ extended: true, limit: '25mb' }));

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: true,
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
  return app;
}

export default async function handler(req: any, res: any) {
  // Dynamic origin reflection for CORS with credentials
  const origin = req.headers?.origin || req.headers?.referer || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const clientPath = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.url;
  if (typeof clientPath === 'string' && clientPath !== '/api') {
    req.url = clientPath;
  }

  if (req.url && !req.url.startsWith('/api/v1')) {
    req.url = '/api/v1' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  try {
    if (!isInitialized) {
      await createNestServer(server);
      isInitialized = true;
    }
    server(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 500,
        message: err?.message || 'Serverless Boot Error',
        error: 'Internal Server Error',
      }),
    );
  }
}
