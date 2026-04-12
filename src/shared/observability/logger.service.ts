import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CorrelationIdContext } from './correlation-id.context';

@Injectable()
export class StructuredLoggerService extends ConsoleLogger {
  public constructor(private readonly appConfig: AppConfig) {
    super(appConfig.serviceName, {
      logLevels: appConfig.logLevel as LogLevel[],
    });
  }

  public override log(message: unknown, context?: string): void {
    super.log(this.formatStructuredMessage('log', message, context));
  }

  public override error(message: unknown, stack?: string, context?: string): void {
    super.error(this.formatStructuredMessage('error', message, context), stack);
  }

  public override warn(message: unknown, context?: string): void {
    super.warn(this.formatStructuredMessage('warn', message, context));
  }

  public override debug(message: unknown, context?: string): void {
    super.debug(this.formatStructuredMessage('debug', message, context));
  }

  public logEvent(payload: Record<string, unknown>, context?: string): void {
    this.log(payload, context);
  }

  public errorEvent(payload: Record<string, unknown>, context?: string): void {
    this.error(payload, undefined, context);
  }

  private formatStructuredMessage(level: string, message: unknown, context?: string): string {
    return JSON.stringify({
      correlationId: CorrelationIdContext.getCorrelationId() ?? null,
      context: context ?? this.context,
      environment: this.appConfig.nodeEnv,
      logger: 'structured_json',
      level,
      message,
      pid: process.pid,
      service: this.appConfig.serviceName,
      timestamp: new Date().toISOString(),
    });
  }
}
