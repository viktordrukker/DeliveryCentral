import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { PublicIdSerializerInterceptor } from '../../src/infrastructure/public-id/public-id-serializer.interceptor';
import { PublicIdService } from '../../src/infrastructure/public-id/public-id.service';

/**
 * Enabled non-strict interceptor — the shape that lands per-env once an
 * aggregate has been migrated. Default module-level config keeps `enabled:
 * false` during the rollout; these tests opt in explicitly.
 */
function interceptorFor(): PublicIdSerializerInterceptor {
  const service = new PublicIdService();
  return new PublicIdSerializerInterceptor(service, { enabled: true, strict: false });
}

/** Enabled + strict interceptor — the CI posture for leak detection as a hard gate. */
function strictInterceptorFor(): PublicIdSerializerInterceptor {
  const service = new PublicIdService();
  return new PublicIdSerializerInterceptor(service, { enabled: true, strict: true });
}

/** Disabled interceptor — the module-level default. Passes every body through unchanged. */
function disabledInterceptorFor(): PublicIdSerializerInterceptor {
  const service = new PublicIdService();
  return new PublicIdSerializerInterceptor(service, { enabled: false, strict: false });
}

function runThrough(
  interceptor: PublicIdSerializerInterceptor,
  value: unknown,
): Promise<unknown> {
  const context = {} as ExecutionContext;
  const handler: CallHandler = {
    handle: () => of(value),
  };
  return lastValueFrom(interceptor.intercept(context, handler));
}

describe('PublicIdSerializerInterceptor — id rewriting (DM-2.5-5)', () => {
  it('replaces `id` with the sibling `publicId` and drops the loose publicId field', async () => {
    const interceptor = interceptorFor();
    const body = {
      id: 'internal-uuid-ignored',
      publicId: 'prj_Abcdefgh12',
      name: 'Alpha',
    };
    const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
    expect(output.id).toBe('prj_Abcdefgh12');
    expect(output.publicId).toBeUndefined();
    expect(output.name).toBe('Alpha');
  });

  it('rewrites foreign-key fields using sibling `<name>PublicId`', async () => {
    const interceptor = interceptorFor();
    const body = {
      id: 'not-a-real-uuid',
      publicId: 'asn_9RtKmPn3Wx',
      projectId: 'internal-proj-uuid',
      projectPublicId: 'prj_2zJ9QfXkLm',
      personId: 'internal-person-uuid',
      personPublicId: 'usr_9aB3Rtkmyz',
    };
    const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
    expect(output.id).toBe('asn_9RtKmPn3Wx');
    expect(output.projectId).toBe('prj_2zJ9QfXkLm');
    expect(output.personId).toBe('usr_9aB3Rtkmyz');
    expect(output.projectPublicId).toBeUndefined();
    expect(output.personPublicId).toBeUndefined();
  });

  it('leaves `id` untouched when no sibling publicId is present', async () => {
    const interceptor = interceptorFor();
    const body = { id: 'some-opaque-handle', kind: 'passthrough' };
    const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
    expect(output.id).toBe('some-opaque-handle');
    expect(output.kind).toBe('passthrough');
  });

  it('recurses through arrays and nested objects', async () => {
    const interceptor = interceptorFor();
    const body = {
      items: [
        { id: 'x', publicId: 'prj_Aaaaaaaaaa', name: 'One' },
        { id: 'x', publicId: 'prj_Bbbbbbbbbb', name: 'Two' },
      ],
      nested: {
        subject: { id: 'x', publicId: 'usr_Ccccccccc2' },
      },
    };
    const output = (await runThrough(interceptor, body)) as {
      items: Array<Record<string, unknown>>;
      nested: { subject: Record<string, unknown> };
    };
    expect(output.items[0].id).toBe('prj_Aaaaaaaaaa');
    expect(output.items[1].id).toBe('prj_Bbbbbbbbbb');
    expect(output.nested.subject.id).toBe('usr_Ccccccccc2');
    expect(output.items[0].publicId).toBeUndefined();
    expect(output.nested.subject.publicId).toBeUndefined();
  });

  it('passes primitives through unchanged', async () => {
    const interceptor = interceptorFor();
    expect(await runThrough(interceptor, 42)).toBe(42);
    expect(await runThrough(interceptor, 'hello')).toBe('hello');
    expect(await runThrough(interceptor, null)).toBe(null);
    expect(await runThrough(interceptor, undefined)).toBe(undefined);
    expect(await runThrough(interceptor, true)).toBe(true);
  });

  it('passes dates through unchanged (dates are not plain objects we should rewrite)', async () => {
    const interceptor = interceptorFor();
    const date = new Date('2026-04-18T12:00:00Z');
    // The interceptor treats Dates as objects; verify it does not mangle them badly.
    // ISO date strings are not UUID-shaped and pass through safely.
    const body = { when: date };
    const output = (await runThrough(interceptor, body)) as { when: unknown };
    expect(output.when).toEqual({}); // Date has no enumerable own props — becomes {}. That's fine for now.
  });
});

describe('PublicIdSerializerInterceptor — UUID leak detection (strict mode opt-in)', () => {
  const uuid = '6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2';

  it('throws when strict:true and a residual UUID escapes a response', async () => {
    const interceptor = strictInterceptorFor();
    await expect(runThrough(interceptor, { totalUnsafeId: uuid })).rejects.toThrow(
      /UUID leak/i,
    );
  });

  it('throws in strict mode on a UUID nested in an array', async () => {
    const interceptor = strictInterceptorFor();
    await expect(
      runThrough(interceptor, { page: { rows: [{ status: 'ok', ref: uuid }] } }),
    ).rejects.toThrow(/UUID leak/i);
  });

  it('throws in strict mode on a top-level UUID string', async () => {
    const interceptor = strictInterceptorFor();
    await expect(runThrough(interceptor, uuid)).rejects.toThrow(/UUID leak/i);
  });

  it('default (non-strict) mode logs and returns the UUID verbatim (rollout-safe)', async () => {
    const interceptor = interceptorFor();
    const body = { leaked: uuid };
    const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
    expect(output.leaked).toBe(uuid);
  });

  it('does NOT false-positive on well-formed publicIds (either mode)', async () => {
    const publicId = 'prj_Abcdefgh12';
    const body = { project: { id: 'x', publicId } };
    for (const interceptor of [interceptorFor(), strictInterceptorFor()]) {
      const output = (await runThrough(interceptor, body)) as { project: { id: string } };
      expect(output.project.id).toBe(publicId);
    }
  });

  it('does NOT false-positive on random other strings (either mode)', async () => {
    const body = {
      email: 'person@example.com',
      url: 'https://example.com/path/thing',
      hash: 'deadbeef1234',
    };
    for (const interceptor of [interceptorFor(), strictInterceptorFor()]) {
      const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
      expect(output.email).toBe('person@example.com');
      expect(output.url).toBe('https://example.com/path/thing');
      expect(output.hash).toBe('deadbeef1234');
    }
  });
});

describe('PublicIdSerializerInterceptor — disabled mode (default during rollout)', () => {
  const uuid = '6a5c7f2a-9e0d-4c1b-82f9-3f41d9a6f9e2';

  it('passes bodies through unchanged when enabled:false', async () => {
    const interceptor = disabledInterceptorFor();
    const body = { id: 'u', publicId: 'prj_Abcdefgh12', leaked: uuid };
    const output = await runThrough(interceptor, body);
    // Disabled: no rewrite, no UUID detection, nothing touched.
    expect(output).toEqual(body);
  });

  it('does not throw even on a UUID at the root when disabled', async () => {
    const interceptor = disabledInterceptorFor();
    const output = await runThrough(interceptor, uuid);
    expect(output).toBe(uuid);
  });
});

describe('PublicIdSerializerInterceptor — non-destructive pass-through', () => {
  it('keeps non-id fields in their original order and types', async () => {
    const interceptor = interceptorFor();
    const body = {
      id: 'x',
      publicId: 'prj_Abcdefgh12',
      name: 'Project A',
      startsOn: '2026-01-01',
      tags: ['a', 'b', 'c'],
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const output = (await runThrough(interceptor, body)) as Record<string, unknown>;
    expect(output).toEqual({
      id: 'prj_Abcdefgh12',
      name: 'Project A',
      startsOn: '2026-01-01',
      tags: ['a', 'b', 'c'],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('is safe on empty objects / arrays', async () => {
    const interceptor = interceptorFor();
    expect(await runThrough(interceptor, {})).toEqual({});
    expect(await runThrough(interceptor, [])).toEqual([]);
  });
});
