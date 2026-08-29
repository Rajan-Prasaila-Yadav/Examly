// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('ExamlyBootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global HTTP Request & Error Logger
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger OpenAPI Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Examly Multi-Tenant API')
    .setDescription('Enterprise Zero-Trust Learning & Examination Platform REST & WebSocket API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Examly API Server running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Interactive Swagger OpenAPI Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
