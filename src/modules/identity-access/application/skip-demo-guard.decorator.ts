import { SetMetadata } from '@nestjs/common';

export const SKIP_DEMO_GUARD_KEY = 'skipDemoGuard';

export function SkipDemoGuard(): MethodDecorator & ClassDecorator {
  return SetMetadata(SKIP_DEMO_GUARD_KEY, true);
}
