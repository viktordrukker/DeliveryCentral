import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { RequestPrincipal } from './request-principal';
import { AuthenticatedPrincipalFactory } from './authenticated-principal.factory';

@Injectable()
export class RequestPrincipalMiddleware implements NestMiddleware {
  public constructor(private readonly authenticatedPrincipalFactory: AuthenticatedPrincipalFactory) {}

  public use(request: Request & { principal?: RequestPrincipal }, _response: Response, next: NextFunction): void {
    request.principal = this.authenticatedPrincipalFactory.createFromRequest(request);

    next();
  }
}
