import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { existsSync } from 'fs';
import { join } from 'path';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

const UPLOADS_PATH = process.env.UPLOADS_PATH ?? join(process.cwd(), 'uploads');
const FRONTEND_PATH = join(process.cwd(), 'frontend');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(UPLOADS_PATH, { prefix: '/uploads', index: false });

  // Angular build sits next to main.js in the production image.
  if (process.env.NODE_ENV === 'production' && existsSync(join(FRONTEND_PATH, 'index.html'))) {
    app.useStaticAssets(FRONTEND_PATH, { index: 'index.html', fallthrough: true });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      res.sendFile(join(FRONTEND_PATH, 'index.html'), (err) => {
        if (err) next();
      });
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS for dev (Angular dev server on :4200)
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({ origin: 'http://localhost:4200', credentials: true });
  }

  // Swagger docs (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('GarageSage API')
      .setDescription('Self-hosted car maintenance tracker API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs: http://localhost:3000/api/docs');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`GarageSage API running on port ${port}`);
}

bootstrap();
