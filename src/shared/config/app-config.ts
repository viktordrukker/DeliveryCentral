import { Injectable } from '@nestjs/common';

import { isPlatformRole, PlatformRole } from '@src/modules/identity-access/domain/platform-role';

@Injectable()
export class AppConfig {
  public readonly apiPrefix: string;
  public readonly authAllowTestHeaders: boolean;
  public readonly authAudience: string;
  public readonly authDevelopmentBootstrapEnabled: boolean;
  public readonly authDevelopmentBootstrapPersonId?: string;
  public readonly authDevelopmentBootstrapRoles: PlatformRole[];
  public readonly authDevelopmentBootstrapUserId?: string;
  public readonly authIssuer: string;
  public readonly authJwtSecret: string;

  // Feature toggles
  public readonly authLocalEnabled: boolean;
  public readonly authLdapEnabled: boolean;
  public readonly authAzureAdEnabled: boolean;

  // Token lifetimes (seconds)
  public readonly authAccessTokenExpiresIn: number;
  public readonly authRefreshTokenExpiresIn: number;
  public readonly authPasswordResetExpiresIn: number;

  // Account security
  public readonly authMaxFailedAttempts: number;
  public readonly authLockoutDurationMinutes: number;

  // 2FA
  public readonly auth2faEnforceRoles: PlatformRole[];
  public readonly auth2faTotpIssuer: string;

  // SMTP toggle
  public readonly smtpEnabled: boolean;

  // LDAP config
  public readonly authLdapUrl: string;
  public readonly authLdapBindDn: string;
  public readonly authLdapBindCredentials: string;
  public readonly authLdapSearchBase: string;
  public readonly authLdapSearchFilter: string;

  // Azure AD config
  public readonly authAzureAdTenantId: string;
  public readonly authAzureAdClientId: string;
  public readonly authAzureAdClientSecret: string;
  public readonly authAzureAdRedirectUri: string;
  public readonly authOidcRoleClaim: string;

  // Seed admin
  public readonly seedAdminEmail: string;
  public readonly seedAdminPassword: string;
  public readonly seedAdminDisplayName: string;

  public readonly demoMode: boolean;
  public readonly corsOrigin: string;
  public readonly databaseUrl: string;
  public readonly exceptionsStaleApprovalDays: number;
  public readonly logLevel: string[];
  public readonly m365DirectoryDefaultOrgUnitId: string | undefined;
  public readonly m365DirectoryMatchStrategy: 'email' | 'none';
  public readonly minutesPerManday: number;
  public readonly nodeEnv: string;
  public readonly notificationsDefaultEmailRecipient: string;
  public readonly notificationsDeliveryRetryDelayMs: number;
  public readonly notificationsDeliveryMaxAttempts: number;
  public readonly notificationsEmailFromAddress: string;
  public readonly notificationsEmailFromName?: string;
  public readonly notificationsEmailReplyTo?: string;
  public readonly notificationsSmtpHost: string;
  public readonly notificationsSmtpPassword?: string;
  public readonly notificationsSmtpPort: number;
  public readonly notificationsSmtpSecure: boolean;
  public readonly notificationsSmtpUsername?: string;
  public readonly notificationsDefaultTeamsWebhookRecipient: string;
  public readonly port: number;
  public readonly radiusAccountMatchStrategy: 'email' | 'none';
  public readonly serviceName: string;

  public constructor() {
    this.nodeEnv = process.env.NODE_ENV ?? 'development';
    this.port = Number(process.env.PORT ?? '3000');
    this.apiPrefix = process.env.API_PREFIX ?? 'api';
    this.authIssuer = process.env.AUTH_ISSUER ?? 'deliverycentral-local';
    this.authAudience = process.env.AUTH_AUDIENCE ?? 'deliverycentral-api';
    this.authJwtSecret = process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret';
    this.authAllowTestHeaders = process.env.AUTH_ALLOW_TEST_HEADERS === 'true';

    if (this.authAllowTestHeaders && process.env.NODE_ENV === 'production') {
      throw new Error(
        'AUTH_ALLOW_TEST_HEADERS must not be enabled in production. ' +
          'This flag allows any caller to impersonate any role without a valid JWT.',
      );
    }

    this.authDevelopmentBootstrapEnabled = process.env.AUTH_DEV_BOOTSTRAP_ENABLED === 'true';
    this.authDevelopmentBootstrapUserId = process.env.AUTH_DEV_BOOTSTRAP_USER_ID ?? undefined;
    this.authDevelopmentBootstrapPersonId = process.env.AUTH_DEV_BOOTSTRAP_PERSON_ID ?? undefined;
    this.authDevelopmentBootstrapRoles = (process.env.AUTH_DEV_BOOTSTRAP_ROLES ?? '')
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(isPlatformRole);
    this.authLocalEnabled = process.env.AUTH_LOCAL_ENABLED !== 'false';
    this.authLdapEnabled = process.env.AUTH_LDAP_ENABLED === 'true';
    this.authAzureAdEnabled = process.env.AUTH_AZURE_AD_ENABLED === 'true';
    this.authAccessTokenExpiresIn = Number(process.env.AUTH_ACCESS_TOKEN_EXPIRES_IN ?? '1800');
    this.authRefreshTokenExpiresIn = Number(process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN ?? '604800');
    this.authPasswordResetExpiresIn = Number(process.env.AUTH_PASSWORD_RESET_EXPIRES_IN ?? '3600');
    this.authMaxFailedAttempts = Number(process.env.AUTH_MAX_FAILED_ATTEMPTS ?? '5');
    this.authLockoutDurationMinutes = Number(process.env.AUTH_LOCKOUT_DURATION_MINUTES ?? '15');
    this.auth2faEnforceRoles = (process.env.AUTH_2FA_ENFORCE_ROLES ?? '')
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(isPlatformRole);
    this.auth2faTotpIssuer = process.env.AUTH_2FA_TOTP_ISSUER ?? 'DeliveryCentral';
    this.smtpEnabled = process.env.SMTP_ENABLED === 'true';
    this.authLdapUrl = process.env.AUTH_LDAP_URL ?? '';
    this.authLdapBindDn = process.env.AUTH_LDAP_BIND_DN ?? '';
    this.authLdapBindCredentials = process.env.AUTH_LDAP_BIND_CREDENTIALS ?? '';
    this.authLdapSearchBase = process.env.AUTH_LDAP_SEARCH_BASE ?? '';
    this.authLdapSearchFilter = process.env.AUTH_LDAP_SEARCH_FILTER ?? '(uid={{username}})';
    this.authAzureAdTenantId = process.env.AUTH_AZURE_AD_TENANT_ID ?? '';
    this.authAzureAdClientId = process.env.AUTH_AZURE_AD_CLIENT_ID ?? '';
    this.authAzureAdClientSecret = process.env.AUTH_AZURE_AD_CLIENT_SECRET ?? '';
    this.authAzureAdRedirectUri = process.env.AUTH_AZURE_AD_REDIRECT_URI ?? '';
    this.authOidcRoleClaim = process.env.AUTH_OIDC_ROLE_CLAIM ?? 'platform_roles';
    this.seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@deliverycentral.local';
    this.seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'DeliveryCentral@Admin1';
    this.seedAdminDisplayName = process.env.SEED_ADMIN_DISPLAY_NAME ?? 'System Administrator';
    this.demoMode = process.env.DEMO_MODE === 'true';
    this.corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
    this.databaseUrl =
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/workload_tracking?schema=public';
    this.exceptionsStaleApprovalDays = Math.max(
      1,
      Number(process.env.EXCEPTIONS_STALE_APPROVAL_DAYS ?? '14'),
    );
    this.logLevel = (process.env.LOG_LEVEL ?? 'log,debug,warn,error').split(',');
    this.m365DirectoryDefaultOrgUnitId =
      process.env.M365_DIRECTORY_DEFAULT_ORG_UNIT_ID ?? undefined;
    this.m365DirectoryMatchStrategy =
      process.env.M365_DIRECTORY_MATCH_STRATEGY === 'none' ? 'none' : 'email';
    this.radiusAccountMatchStrategy =
      process.env.RADIUS_ACCOUNT_MATCH_STRATEGY === 'none' ? 'none' : 'email';
    this.notificationsDefaultEmailRecipient =
      process.env.NOTIFICATIONS_DEFAULT_EMAIL_RECIPIENT ?? 'ops@example.com';
    this.notificationsDeliveryMaxAttempts = Math.max(
      1,
      Number(process.env.NOTIFICATIONS_DELIVERY_MAX_ATTEMPTS ?? '3'),
    );
    this.notificationsDeliveryRetryDelayMs = Math.max(
      0,
      Number(process.env.NOTIFICATIONS_DELIVERY_RETRY_DELAY_MS ?? '0'),
    );
    this.notificationsEmailFromAddress =
      process.env.NOTIFICATIONS_EMAIL_FROM_ADDRESS ?? 'noreply@example.com';
    this.notificationsEmailFromName =
      process.env.NOTIFICATIONS_EMAIL_FROM_NAME?.trim() || undefined;
    this.notificationsEmailReplyTo =
      process.env.NOTIFICATIONS_EMAIL_REPLY_TO?.trim() || undefined;
    this.notificationsSmtpHost = process.env.NOTIFICATIONS_SMTP_HOST ?? '';
    this.notificationsSmtpPort = Number(process.env.NOTIFICATIONS_SMTP_PORT ?? '587');
    this.notificationsSmtpSecure = process.env.NOTIFICATIONS_SMTP_SECURE === 'true';
    this.notificationsSmtpUsername =
      process.env.NOTIFICATIONS_SMTP_USERNAME?.trim() || undefined;
    this.notificationsSmtpPassword =
      process.env.NOTIFICATIONS_SMTP_PASSWORD?.trim() || undefined;
    this.notificationsDefaultTeamsWebhookRecipient =
      process.env.NOTIFICATIONS_DEFAULT_TEAMS_WEBHOOK_RECIPIENT ??
      'https://example.invalid/teams-webhook';
    this.minutesPerManday = Number(process.env.MINUTES_PER_MANDAY ?? '480');
    this.serviceName = process.env.SERVICE_NAME ?? 'workload-tracking-platform';
  }
}
