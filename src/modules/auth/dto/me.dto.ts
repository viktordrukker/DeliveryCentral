export interface MeDto {
  userId: string;
  personId?: string;
  email: string;
  displayName: string;
  roles: string[];
  source: string;
  twoFactorEnabled: boolean;
  requires2FASetup: boolean;
}
