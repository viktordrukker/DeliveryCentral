import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppConfig } from '@src/shared/config/app-config';

export interface JwtAccessPayload {
  sub: string;
  email?: string;
  person_id?: string;
  platform_roles?: string[];
  roles?: string[];
  scope?: string;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  public constructor(private readonly appConfig: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.authJwtSecret,
      issuer: appConfig.authIssuer,
      audience: appConfig.authAudience,
    });
  }

  public validate(payload: JwtAccessPayload): JwtAccessPayload {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    return payload;
  }
}
