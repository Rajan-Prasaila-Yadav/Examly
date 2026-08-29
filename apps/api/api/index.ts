import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
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
  if (!isInitialized) {
    await createNestServer(server);
    isInitialized = true;
  }
  server(req, res);
}
