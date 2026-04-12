import { SetMetadata } from '@nestjs/common';

export interface SelfScopeOptions {
  param: string;
}

export const SELF_SCOPE_KEY = 'identity_access:self_scope';

export function AllowSelfScope(options: SelfScopeOptions): MethodDecorator & ClassDecorator {
  return SetMetadata(SELF_SCOPE_KEY, options);
}
