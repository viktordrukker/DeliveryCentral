import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { AppConfig } from './shared/config/app-config';
import { StructuredLoggerService } from './shared/observability/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(StructuredLoggerService);
  app.useLogger(logger);

  const appConfig = app.get(AppConfig);
  app.enableCors({
    origin: appConfig.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
  app.use((req: unknown, res: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';",
      );
    }
    next();
  });

  app.setGlobalPrefix(appConfig.apiPrefix);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

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
