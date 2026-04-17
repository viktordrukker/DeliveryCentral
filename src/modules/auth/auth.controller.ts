import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { Throttle } from '@nestjs/throttler';
import { AppConfig } from '@src/shared/config/app-config';
import { Public } from '@src/modules/identity-access/application/public.decorator';
import { SkipDemoGuard } from '@src/modules/identity-access/application/skip-demo-guard.decorator';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { TwoFactorService } from './two-factor.service';
import { PasswordService } from './password.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { Disable2faDto, TwoFaLoginDto, Verify2faDto } from './dto/verify-2fa.dto';

const REFRESH_COOKIE = 'dc_refresh';

@Public()
@SkipDemoGuard()
@Controller('auth')
export class AuthController {
  public constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly passwordService: PasswordService,
    private readonly appConfig: AppConfig,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  public async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string } | { requires2FA: true; tempToken: string }> {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      req.headers['user-agent'],
      req.ip,
    );

    if ('requires2FA' in result) {
      return result;
    }

    setRefreshCookie(res, result.refreshToken);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (token) {
      await this.tokenService.revokeRefreshToken(token);
    }

    res.clearCookie(REFRESH_COOKIE);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const pair = await this.tokenService.refresh(token);

    setRefreshCookie(res, pair.refreshToken);

    return { accessToken: pair.accessToken };
  }

  @Post('password-reset/request')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<void> {
    await this.passwordService.requestPasswordReset(dto.email);
  }

  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto): Promise<void> {
    await this.passwordService.confirmPasswordReset(dto.token, dto.newPassword);
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  public async setup2fa(
    @Req() req: Request & { principal?: { userId?: string } },
  ): Promise<{ qrCodeDataUri: string; backupCodes: string[] }> {
    const accountId = req.principal?.userId;

    if (!accountId) {
      throw new UnauthorizedException('Authentication required.');
    }

    const result = await this.twoFactorService.setup(accountId);

    return { qrCodeDataUri: result.qrCodeDataUri, backupCodes: result.backupCodes };
  }

  @Post('2fa/verify')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async verify2fa(
    @Body() dto: Verify2faDto,
    @Req() req: Request & { principal?: { userId?: string } },
  ): Promise<void> {
    const accountId = req.principal?.userId;

    if (!accountId) {
      throw new UnauthorizedException('Authentication required.');
    }

    await this.twoFactorService.verify(accountId, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async disable2fa(
    @Body() dto: Disable2faDto,
    @Req() req: Request & { principal?: { userId?: string } },
  ): Promise<void> {
    const accountId = req.principal?.userId;

    if (!accountId) {
      throw new UnauthorizedException('Authentication required.');
    }

    await this.twoFactorService.disable(accountId, dto.password);
  }

  @Post('2fa/login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  public async twoFaLogin(
    @Body() dto: TwoFaLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const pair = await this.twoFactorService.completeTwoFactorLogin(
      dto.tempToken,
      dto.code,
      req.headers['user-agent'],
      req.ip,
    );

    setRefreshCookie(res, pair.refreshToken);

    return { accessToken: pair.accessToken };
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request & { principal?: { userId?: string } },
  ): Promise<void> {
    const accountId = req.principal?.userId;

    if (!accountId) {
      throw new UnauthorizedException('Authentication required.');
    }

    await this.passwordService.changePassword(accountId, dto.currentPassword, dto.newPassword);
  }

  @Get('me')
  public async getMe(
    @Req() req: Request & { principal?: { userId?: string } },
  ): Promise<import('./dto/me.dto').MeDto> {
    const accountId = req.principal?.userId;

    if (!accountId) {
      throw new UnauthorizedException('Authentication required.');
    }

    return this.authService.getMe(accountId);
  }

  @Get('providers')
  public getProviders(): { local: boolean; ldap: boolean; azureAd: boolean } {
    return {
      local: this.appConfig.authLocalEnabled,
      ldap: this.appConfig.authLdapEnabled,
      azureAd: this.appConfig.authAzureAdEnabled,
    };
  }
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}
