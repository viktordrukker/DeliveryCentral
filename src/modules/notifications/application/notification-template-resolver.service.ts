import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationTemplateResolver {
  public resolve(template: string, payload: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
      const value = this.resolvePath(payload, key);
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private resolvePath(payload: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((current, segment) => {
      if (typeof current !== 'object' || current === null) {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, payload);
  }
}
