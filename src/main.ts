import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

import { AppModule } from './app.module';
import { PrismaService } from './shared/persistence/prisma.service';
import { SetupTokenService } from './modules/setup/application/setup-token.service';
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

  // Setup wizard boot integration. Runs BEFORE listen() so the wizard's
  // /setup endpoints answer immediately and the operator's first browser
  // hit lands on the correct screen.
  await initialiseSetupWizard(app);

  const server = await app.listen(appConfig.port, '0.0.0.0');
  server.setTimeout(30000); // 30 second timeout

  Logger.log(
    `HTTP server listening on port ${appConfig.port} with prefix ${appConfig.apiPrefix}`,
    'Bootstrap',
  );
}

/**
 * On every backend boot:
 *   1. CLEAN_INSTALL=true: clear `setup.completedAt` + `setup_runs` so the
 *      next browser hit lands on the wizard. Operators flag this in the
 *      env file when they want to re-arm.
 *   2. If the platform is not yet set up (no `setup.completedAt`), issue
 *      a setup token and write it to stdout (visible via `docker logs`).
 *   3. (Phase 7) probe `prisma migrate status` and write the pending-
 *      migration list to a runtime sentinel for the admin banner. NOT
 *      blocking — the app continues to serve in degraded mode.
 *
 * Failures are logged and swallowed. The HTTP listener still comes up so
 * the wizard endpoints (and /api/health, etc.) are reachable.
 */
async function initialiseSetupWizard(
  app: Awaited<ReturnType<typeof NestFactory.create>>,
): Promise<void> {
  const log = (msg: string, level: 'log' | 'warn' | 'error' = 'log'): void => {
    Logger[level](msg, 'setup-wizard-bootstrap');
  };
  try {
    const prisma = app.get(PrismaService);
    const tokenService = app.get(SetupTokenService);

    // 1. CLEAN_INSTALL re-arm
    if (process.env.CLEAN_INSTALL === 'true') {
      log('CLEAN_INSTALL=true detected — clearing setup_runs + setup.completedAt sentinel', 'warn');
      try {
        await prisma.$transaction([
          prisma.setupRunLog.deleteMany({}),
          prisma.setupRun.deleteMany({}),
          prisma.platformSetting.upsert({
            where: { key: 'setup.completedAt' },
            update: { value: null as never },
            create: { key: 'setup.completedAt', value: null as never },
          }),
        ]);
      } catch (err) {
        log(
          `CLEAN_INSTALL re-arm failed (continuing): ${err instanceof Error ? err.message : String(err)}`,
          'warn',
        );
      }
    }

    // 2. Issue setup token if the platform isn't set up yet
    let needsSetup = false;
    try {
      const completed = await prisma.platformSetting.findUnique({
        where: { key: 'setup.completedAt' },
      });
      needsSetup = !completed || completed.value === null;
    } catch (err) {
      log(
        `Could not read setup.completedAt sentinel (assuming setup required): ${
          err instanceof Error ? err.message : String(err)
        }`,
        'warn',
      );
      needsSetup = true;
    }

    if (needsSetup) {
      try {
        await tokenService.issue();
      } catch (err) {
        log(
          `Could not issue setup token: ${err instanceof Error ? err.message : String(err)}`,
          'warn',
        );
      }
    }
  } catch (err) {
    log(
      `Setup-wizard bootstrap failed (HTTP server will still come up): ${
        err instanceof Error ? err.message : String(err)
      }`,
      'error',
    );
  }
}

void bootstrap();
