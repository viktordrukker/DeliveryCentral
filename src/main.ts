import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

import { AppModule } from './app.module';
import { AppConfig } from './shared/config/app-config';
import { StructuredLoggerService } from './shared/observability/logger.service';

// Surface unhandled async errors that would otherwise crash the process silently. (PROC-01)
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  console.error(JSON.stringify({ level: 'error', type: 'unhandled_rejection', message, stack }));
});
process.on('uncaughtException', (error) => {
  console.error(
    JSON.stringify({ level: 'error', type: 'uncaught_exception', message: error.message, stack: error.stack }),
  );
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Cap request body size (BODY-01). 1 MB is generous for JSON APIs and keeps DoS surface small.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);

  const appConfig = app.get(AppConfig);
  app.enableCors({
    origin: appConfig.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.use((_req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';",
    );
    // Authenticated API responses should never be cached by browsers or intermediate proxies. (CACHE-02)
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.setGlobalPrefix(appConfig.apiPrefix);
  // whitelist strips unknown fields silently — blocks mass-assignment without breaking
  // legacy clients that send extra query params. forbidNonWhitelisted will be re-enabled
  // after STAGE 12 (API consistency) ensures every endpoint has a complete query DTO. (SEC-17)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Workload Tracking Platform API')
      .setDescription('REST API for project staffing, workload planning, and work evidence.')
      .setVersion('0.1.0')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appConfig.apiPrefix}/docs`, app, document);
  }

  const server = await app.listen(appConfig.port, '0.0.0.0');
  server.setTimeout(30000); // 30 second timeout

  Logger.log(
    `HTTP server listening on port ${appConfig.port} with prefix ${appConfig.apiPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
