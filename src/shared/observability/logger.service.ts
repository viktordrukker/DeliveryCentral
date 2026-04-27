import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

import { AppConfig } from '../config/app-config';
import { CorrelationIdContext } from './correlation-id.context';

// OBS-01: keys whose values are scrubbed before being serialized into log output.
// Matches case-insensitively against object keys at any depth.
const SENSITIVE_KEY_PATTERN = /(password|passwd|secret|token|jwt|otp|cookie|authorization|apikey|api[_-]?key|backupcode|sessionid|set-cookie)/i;
const REDACTED = '[REDACTED]';

function redact(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((v) => redact(v, seen));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = redact(v, seen);
    }
  }
  return out;
}

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
      message: redact(message),
      pid: process.pid,
      service: this.appConfig.serviceName,
      timestamp: new Date().toISOString(),
    });
  }
}
