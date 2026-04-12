import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtAccessStrategy],
})
export class AuthModule {}
