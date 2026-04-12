import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  public constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  public async validate(email: string, password: string): Promise<unknown> {
    const account = await this.authService.validateLocalCredentials(email, password);

    if (!account) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return account;
  }
}
