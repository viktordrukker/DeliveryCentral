import { signPlatformJwt } from '@src/modules/identity-access/application/platform-jwt';

export function roleHeaders(...roles: string[]): Record<string, string> {
  const token = signPlatformJwt(
    {
      person_id: 'test-person',
      roles,
      sub: 'test-user',
    },
    {
      audience: process.env.AUTH_AUDIENCE ?? 'deliverycentral-api',
      issuer: process.env.AUTH_ISSUER ?? 'deliverycentral-local',
      secret: process.env.AUTH_JWT_SECRET ?? 'deliverycentral-local-dev-secret',
    },
  );

  return {
    authorization: `Bearer ${token}`,
  };
}
