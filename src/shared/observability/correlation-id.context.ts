import { AsyncLocalStorage } from 'node:async_hooks';

const correlationIdStorage = new AsyncLocalStorage<Map<string, string>>();

export class CorrelationIdContext {
  public static run(correlationId: string, callback: () => void): void {
    const store = new Map<string, string>([['correlationId', correlationId]]);
    correlationIdStorage.run(store, callback);
  }

  public static getCorrelationId(): string | undefined {
    return correlationIdStorage.getStore()?.get('correlationId');
  }
}
