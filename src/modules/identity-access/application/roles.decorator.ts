import { SetMetadata } from '@nestjs/common';

import { PlatformRole } from '../domain/platform-role';

export const REQUIRED_ROLES_KEY = 'required_platform_roles';

export function RequireRoles(...roles: PlatformRole[]) {
  return SetMetadata(REQUIRED_ROLES_KEY, roles);
}
