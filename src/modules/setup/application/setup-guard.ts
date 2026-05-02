import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { SetupTokenService } from './setup-token.service';

/**
 * Guards every `/setup/*` HTTP endpoint. Two checks:
 *   1. The wizard is currently armed (token service has an active token).
 *   2. The request carries a matching `X-Setup-Token` header.
 *
 * On failure: `401 Unauthorized` — never reveals whether the token was
 * wrong vs. the wizard is locked out (industry-standard auth idiom).
 *
 * Once the wizard's `complete` step runs, the token service invalidates
 * itself and this guard rejects everything until the next CLEAN_INSTALL
 * boot or admin Reset.
 */
@Injectable()
export class SetupTokenGuard implements CanActivate {
  public constructor(private readonly token: SetupTokenService) {}

  public canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const presented = req.headers['x-setup-token'];
    const single = Array.isArray(presented) ? presented[0] : presented;
    if (!this.token.isActive() || !this.token.verify(single ?? null)) {
      throw new UnauthorizedException('Setup token missing or invalid.');
    }
    return true;
  }
}
