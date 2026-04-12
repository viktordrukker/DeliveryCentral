import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { SettingsResponseDto, UpdateSettingResponseDto } from './contracts/platform-settings.dto';

const DEFAULTS: Record<string, unknown> = {
  'general.platformName': 'DeliveryCentral',
  'general.timezone': 'UTC',
  'general.fiscalYearStart': 1,
  'general.dateFormat': 'YYYY-MM-DD',
  'general.currency': 'AUD',
  'timesheets.enabled': true,
  'timesheets.standardHoursPerWeek': 40,
  'timesheets.maxHoursPerDay': 12,
  'timesheets.weekStartDay': 1,
  'timesheets.autoPopulate': false,
  'timesheets.approvalRequired': true,
  'timesheets.lockAfterDays': 14,
  'capitalisation.enabled': true,
  'capitalisation.defaultClassification': 'OPEX',
  'capitalisation.reconciliationAlerts': true,
  'pulse.enabled': true,
  'pulse.frequency': 'weekly',
  'pulse.anonymousMode': false,
  'pulse.alertThreshold': 2,
  'notifications.emailEnabled': true,
  'notifications.inAppEnabled': true,
  'notifications.digestFrequency': 'daily',
  'security.sessionTimeoutMinutes': 480,
  'security.maxLoginAttempts': 5,
  'security.passwordMinLength': 8,
  'security.mfaEnabled': false,
  'sso.enabled': false,
  'sso.providerName': '',
  'sso.issuerUrl': '',
  'sso.clientId': '',
  'sso.clientSecret': '',
  'sso.scopes': 'openid profile email',
  'sso.callbackUrl': '/auth/oidc/callback',
  'sso.autoProvisionUsers': false,
  'sso.defaultRole': 'employee',
  'onboarding.tourEnabled': true,
  'onboarding.tooltipsEnabled': true,
  'onboarding.showOnFirstLogin': true,
  'onboarding.welcomeMessage': 'Welcome to DeliveryCentral! Let us show you around.',
  'dashboard.staffingGapDaysThreshold': 28,
  'dashboard.evidenceInactiveDaysThreshold': 14,
  'dashboard.nearingClosureDaysThreshold': 30,
};

@Injectable()
export class PlatformSettingsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  public async getAll(): Promise<SettingsResponseDto> {
    const rows = await this.prisma.platformSetting.findMany();
    const map: Record<string, unknown> = { ...DEFAULTS };

    for (const row of rows) {
      map[row.key] = row.value;
    }

    return {
      general: {
        platformName: map['general.platformName'] as string,
        timezone: map['general.timezone'] as string,
        fiscalYearStart: map['general.fiscalYearStart'] as number,
        dateFormat: map['general.dateFormat'] as string,
        currency: map['general.currency'] as string,
      },
      timesheets: {
        enabled: map['timesheets.enabled'] as boolean,
        standardHoursPerWeek: map['timesheets.standardHoursPerWeek'] as number,
        maxHoursPerDay: map['timesheets.maxHoursPerDay'] as number,
        weekStartDay: map['timesheets.weekStartDay'] as number,
        autoPopulate: map['timesheets.autoPopulate'] as boolean,
        approvalRequired: map['timesheets.approvalRequired'] as boolean,
        lockAfterDays: map['timesheets.lockAfterDays'] as number,
      },
      capitalisation: {
        enabled: map['capitalisation.enabled'] as boolean,
        defaultClassification: map['capitalisation.defaultClassification'] as string,
        reconciliationAlerts: map['capitalisation.reconciliationAlerts'] as boolean,
      },
      pulse: {
        enabled: map['pulse.enabled'] as boolean,
        frequency: map['pulse.frequency'] as string,
        anonymousMode: map['pulse.anonymousMode'] as boolean,
        alertThreshold: map['pulse.alertThreshold'] as number,
      },
      notifications: {
        emailEnabled: map['notifications.emailEnabled'] as boolean,
        inAppEnabled: map['notifications.inAppEnabled'] as boolean,
        digestFrequency: map['notifications.digestFrequency'] as string,
      },
      security: {
        sessionTimeoutMinutes: map['security.sessionTimeoutMinutes'] as number,
        maxLoginAttempts: map['security.maxLoginAttempts'] as number,
        passwordMinLength: map['security.passwordMinLength'] as number,
        mfaEnabled: map['security.mfaEnabled'] as boolean,
      },
      sso: {
        enabled: map['sso.enabled'] as boolean,
        providerName: map['sso.providerName'] as string,
        issuerUrl: map['sso.issuerUrl'] as string,
        clientId: map['sso.clientId'] as string,
        clientSecret: map['sso.clientSecret'] as string,
        scopes: map['sso.scopes'] as string,
        callbackUrl: map['sso.callbackUrl'] as string,
        autoProvisionUsers: map['sso.autoProvisionUsers'] as boolean,
        defaultRole: map['sso.defaultRole'] as string,
      },
      onboarding: {
        tourEnabled: map['onboarding.tourEnabled'] as boolean,
        tooltipsEnabled: map['onboarding.tooltipsEnabled'] as boolean,
        showOnFirstLogin: map['onboarding.showOnFirstLogin'] as boolean,
        welcomeMessage: map['onboarding.welcomeMessage'] as string,
      },
      dashboard: {
        staffingGapDaysThreshold: map['dashboard.staffingGapDaysThreshold'] as number,
        evidenceInactiveDaysThreshold: map['dashboard.evidenceInactiveDaysThreshold'] as number,
        nearingClosureDaysThreshold: map['dashboard.nearingClosureDaysThreshold'] as number,
      },
    };
  }

  public async updateKey(
    key: string,
    value: unknown,
    actorId?: string,
  ): Promise<UpdateSettingResponseDto> {
    let oldValue: unknown = DEFAULTS[key] ?? null;

    const existing = await this.prisma.platformSetting.findUnique({ where: { key } });
    if (existing) {
      oldValue = existing.value;
    }

    const updated = await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value: value as never, updatedBy: actorId ?? null },
      create: { key, value: value as never, updatedBy: actorId ?? null },
    });

    this.auditLogger.record({
      action: 'UPDATE',
      actionType: 'UPDATE',
      actorId: actorId ?? null,
      category: 'metadata',
      targetEntityType: 'PlatformSetting',
      targetEntityId: key,
      changeSummary: `Updated platform setting ${key}`,
      details: { oldValue, newValue: value },
      metadata: { oldValue, newValue: value },
    });

    return {
      key: updated.key,
      value: updated.value,
      updatedBy: updated.updatedBy ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
