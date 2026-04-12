import { PlatformRole } from '../domain/platform-role';

export interface RequestPrincipal {
  authSource: 'bearer_token' | 'development_bootstrap' | 'test_header';
  personId?: string;
  roles: PlatformRole[];
  userId?: string;
}
