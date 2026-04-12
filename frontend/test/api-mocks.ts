import { vi } from 'vitest';

export interface DeferredPromise<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}

export function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolve!: DeferredPromise<T>['resolve'];
  let reject!: DeferredPromise<T>['reject'];

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

export function createPendingPromise<T>(): Promise<T> {
  return createDeferredPromise<T>().promise;
}

export function asMock<T extends (...args: never[]) => unknown>(fn: T) {
  return vi.mocked(fn);
}
