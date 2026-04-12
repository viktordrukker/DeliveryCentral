import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

import { AppConfig } from '@src/shared/config/app-config';
import { SKIP_DEMO_GUARD_KEY } from './skip-demo-guard.decorator';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class DemoModeGuard implements CanActivate {
  public constructor(
    private readonly appConfig: AppConfig,
    private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    if (!this.appConfig.demoMode) {
      return true;
    }

    const req = context.switchToHttp().getRequest<{ method: string }>();

    if (!WRITE_METHODS.has(req.method)) {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_DEMO_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const response = context.switchToHttp().getResponse<Response>();
    response.status(200).json({ demo: true, message: 'Write operations are disabled in demo mode.' });

    return false;
  }
}
