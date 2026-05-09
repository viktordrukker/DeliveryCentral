import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';

import { DeprecatedEndpointMetadata } from '@src/shared/http/deprecated-endpoint.decorator';
import { DeprecatedEndpointInterceptor } from '@src/shared/http/deprecated-endpoint.interceptor';

describe('DeprecatedEndpointInterceptor', () => {
  const FIXED_METADATA: DeprecatedEndpointMetadata = {
    sunsetIso: '2026-08-01',
    successorPath: '/assignments/:id/book',
    label: 'assignment.legacy.approve',
  };

  function buildContext(opts: {
    metadata?: DeprecatedEndpointMetadata;
    setHeader: (name: string, value: string) => void;
  }): { reflector: Reflector; context: ExecutionContext; nextHandle: () => any } {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(opts.metadata as DeprecatedEndpointMetadata);

    const context = {
      switchToHttp: () => ({
        getResponse: () => ({ setHeader: opts.setHeader }),
        getRequest: () => ({ method: 'POST', originalUrl: '/api/assignments/abc/approve' }),
      }),
      getHandler: () => () => undefined,
      getClass: () => class {},
    } as unknown as ExecutionContext;

    return { reflector, context, nextHandle: () => of('result') };
  }

  it('sets Deprecation, Sunset, and Link headers when metadata is present', async () => {
    const headers = new Map<string, string>();
    const setHeader = (name: string, value: string): void => {
      headers.set(name, value);
    };

    const { reflector, context, nextHandle } = buildContext({
      metadata: FIXED_METADATA,
      setHeader,
    });
    const interceptor = new DeprecatedEndpointInterceptor(reflector);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const observable = interceptor.intercept(context, { handle: nextHandle } as never);
    const result = await lastValueFrom(observable);

    expect(result).toBe('result');
    expect(headers.get('Deprecation')).toBe('true');
    expect(headers.get('Sunset')).toBe(new Date(FIXED_METADATA.sunsetIso).toUTCString());
    expect(headers.get('Link')).toBe(`<${FIXED_METADATA.successorPath}>; rel="successor-version"`);
  });

  it('logs a structured warning carrying the stable label', async () => {
    const setHeader = (): void => undefined;
    const { reflector, context, nextHandle } = buildContext({
      metadata: FIXED_METADATA,
      setHeader,
    });
    const interceptor = new DeprecatedEndpointInterceptor(reflector);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await lastValueFrom(interceptor.intercept(context, { handle: nextHandle } as never));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const arg = warnSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed.event).toBe('legacy_endpoint_call');
    expect(parsed.label).toBe(FIXED_METADATA.label);
    expect(parsed.successor).toBe(FIXED_METADATA.successorPath);
  });

  it('passes through cleanly when no metadata is present', async () => {
    let touched = false;
    const setHeader = (): void => {
      touched = true;
    };
    const { reflector, context, nextHandle } = buildContext({
      metadata: undefined,
      setHeader,
    });
    const interceptor = new DeprecatedEndpointInterceptor(reflector);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const result = await lastValueFrom(
      interceptor.intercept(context, { handle: nextHandle } as never),
    );

    expect(result).toBe('result');
    expect(touched).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
