import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class GeneralSettingsDto {
  @ApiProperty()
  public platformName!: string;

  @ApiProperty()
  public timezone!: string;

  @ApiProperty()
  public fiscalYearStart!: number;

  @ApiProperty()
  public dateFormat!: string;

  @ApiProperty()
  public currency!: string;
}

export class TimesheetsSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public standardHoursPerWeek!: number;

  @ApiProperty()
  public maxHoursPerDay!: number;

  @ApiProperty()
  public weekStartDay!: number;

  @ApiProperty()
  public autoPopulate!: boolean;

  @ApiProperty()
  public approvalRequired!: boolean;

  @ApiProperty()
  public lockAfterDays!: number;
}

export class CapitalisationSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public defaultClassification!: string;

  @ApiProperty()
  public reconciliationAlerts!: boolean;
}

export class PulseSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public frequency!: string;

  @ApiProperty()
  public anonymousMode!: boolean;

  @ApiProperty()
  public alertThreshold!: number;
}

export class NotificationsSettingsDto {
  @ApiProperty()
  public emailEnabled!: boolean;

  @ApiProperty()
  public inAppEnabled!: boolean;

  @ApiProperty()
  public digestFrequency!: string;
}

export class SecuritySettingsDto {
  @ApiProperty()
  public sessionTimeoutMinutes!: number;

  @ApiProperty()
  public maxLoginAttempts!: number;

  @ApiProperty()
  public passwordMinLength!: number;

  @ApiProperty()
  public mfaEnabled!: boolean;
}

export class SsoOidcSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public providerName!: string;

  @ApiProperty()
  public issuerUrl!: string;

  @ApiProperty()
  public clientId!: string;

  @ApiProperty()
  public clientSecret!: string;

  @ApiProperty()
  public scopes!: string;

  @ApiProperty()
  public callbackUrl!: string;

  @ApiProperty()
  public autoProvisionUsers!: boolean;

  @ApiProperty()
  public defaultRole!: string;
}

export class DashboardSettingsDto {
  @ApiProperty()
  public staffingGapDaysThreshold!: number;

  @ApiProperty()
  public evidenceInactiveDaysThreshold!: number;

  @ApiProperty()
  public nearingClosureDaysThreshold!: number;
}

export class EvidenceManagementSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public allowManualEntry!: boolean;

  @ApiProperty()
  public showDiagnosticsInCoreDashboards!: boolean;

  @ApiProperty({ type: [String] })
  public allowedSources!: string[];

  @ApiPropertyOptional({ nullable: true })
  public retentionDays!: number | null;
}

export class OnboardingSettingsDto {
  @ApiProperty()
  public tourEnabled!: boolean;

  @ApiProperty()
  public tooltipsEnabled!: boolean;

  @ApiProperty()
  public showOnFirstLogin!: boolean;

  @ApiProperty()
  public welcomeMessage!: string;
}

export class LeaveSettingsDto {
  @ApiProperty()
  public annualEntitlementDays!: number;

  @ApiProperty()
  public sickAutoApprove!: boolean;

  @ApiProperty()
  public sickCertificateRequiredDays!: number;

  @ApiProperty()
  public overtimeOffEnabled!: boolean;

  @ApiProperty()
  public personalRequiresComment!: boolean;

  @ApiProperty()
  public bereavementAutoApprove!: boolean;
}

export class TimeEntrySettingsDto {
  @ApiProperty()
  public benchEnabled!: boolean;

  @ApiProperty({ type: [String] })
  public benchCategories!: string[];

  @ApiProperty()
  public copyPreviousEnabled!: boolean;

  @ApiProperty()
  public autoFillFromAssignments!: boolean;

  @ApiProperty()
  public gapDetectionEnabled!: boolean;

  @ApiProperty()
  public standardHoursPerDay!: number;

  @ApiProperty({ description: 'Allow submitting a week before its last day has passed.' })
  public allowSubmitInAdvance!: boolean;

  @ApiProperty({ description: 'Allow entering hours on dates that have not occurred yet.' })
  public allowFutureDateEntry!: boolean;

  @ApiProperty({ description: 'Hard cap on hours that can be logged on a single day per row.' })
  public maxHoursPerDay!: number;

  @ApiProperty({ description: 'Hard cap on total reported hours in a single week (enforced on submit).' })
  public maxHoursPerWeek!: number;
}

export class OvertimeSettingsDto {
  @ApiProperty()
  public enabled!: boolean;

  @ApiProperty()
  public defaultMaxOvertimePerWeek!: number;

  @ApiProperty()
  public requireApproval!: boolean;

  @ApiProperty()
  public warningThresholdPercent!: number;

  @ApiProperty()
  public autoFlagOnSubmit!: boolean;
}

export class SettingsResponseDto {
  @ApiProperty({ type: GeneralSettingsDto })
  public general!: GeneralSettingsDto;

  @ApiProperty({ type: TimesheetsSettingsDto })
  public timesheets!: TimesheetsSettingsDto;

  @ApiProperty({ type: CapitalisationSettingsDto })
  public capitalisation!: CapitalisationSettingsDto;

  @ApiProperty({ type: PulseSettingsDto })
  public pulse!: PulseSettingsDto;

  @ApiProperty({ type: NotificationsSettingsDto })
  public notifications!: NotificationsSettingsDto;

  @ApiProperty({ type: SecuritySettingsDto })
  public security!: SecuritySettingsDto;

  @ApiProperty({ type: SsoOidcSettingsDto })
  public sso!: SsoOidcSettingsDto;

  @ApiProperty({ type: OnboardingSettingsDto })
  public onboarding!: OnboardingSettingsDto;

  @ApiProperty({ type: DashboardSettingsDto })
  public dashboard!: DashboardSettingsDto;

  @ApiProperty({ type: EvidenceManagementSettingsDto })
  public evidenceManagement!: EvidenceManagementSettingsDto;

  @ApiProperty({ type: OvertimeSettingsDto })
  public overtime!: OvertimeSettingsDto;

  @ApiProperty({ type: LeaveSettingsDto })
  public leave!: LeaveSettingsDto;

  @ApiProperty({ type: TimeEntrySettingsDto })
  public timeEntry!: TimeEntrySettingsDto;
}

export class UpdateSettingDto {
  @ApiProperty({ description: 'New value for the setting key' })
  @IsDefined()
  public value!: unknown;
}

export class UpdateSettingResponseDto {
  @ApiProperty()
  public key!: string;

  @ApiProperty()
  public value!: unknown;

  @ApiPropertyOptional({ nullable: true })
  public updatedBy?: string | null;

  @ApiProperty()
  public updatedAt!: string;
}
