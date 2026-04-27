import { PrismaService } from '@src/shared/persistence/prisma.service';

// TEST-04: stubs the surface of `PrismaService` that the application calls at
// startup but that test-time consumers don't care about. The most common
// breakage: `PublicIdBootstrapService.onModuleInit` calls `prisma.$use(...)` to
// install the public-id middleware; without a `$use` stub the bootstrap throws
// before any test code runs. Pass model overrides via the `models` parameter.
export function createPrismaServiceStub(
  models: Record<string, unknown> = {},
): PrismaService {
  const stub: Record<string, unknown> = {
    $use: jest.fn(),
    $on: jest.fn(),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    ...models,
  };
  // Defined after the stub object exists so the callback-form receives the
  // populated stub (model overrides included), not a half-built reference.
  stub.$transaction = jest.fn().mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => unknown)(stub);
    }
    return arg;
  });
  return stub as unknown as PrismaService;
}
