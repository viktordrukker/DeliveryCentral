import { Module } from '@nestjs/common';

import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { PasswordService } from './password.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [AuthController, OidcController],
  providers: [AuthService, TokenService, TwoFactorService, PasswordService, OidcService, LocalStrategy, JwtAccessStrategy],
  exports: [TokenService],
})
export class AuthModule {}
