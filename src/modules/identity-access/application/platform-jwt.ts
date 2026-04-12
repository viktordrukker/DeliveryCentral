import { createHmac, timingSafeEqual } from 'node:crypto';

import { isPlatformRole, PlatformRole } from '../domain/platform-role';

export interface PlatformJwtClaims {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  person_id?: string;
  platform_roles?: string[];
  roles?: string[];
  sub: string;
}

export interface PlatformJwtVerificationOptions {
  audience: string;
  issuer: string;
  nowEpochSeconds?: number;
  secret: string;
}

export interface PlatformJwtSigningOptions {
  audience: string;
  expiresInSeconds?: number;
  issuer: string;
  nowEpochSeconds?: number;
  secret: string;
}

export interface AuthenticatedPrincipalClaims {
  personId?: string;
  roles: PlatformRole[];
  userId: string;
}

interface JwtHeader {
  alg?: string;
  typ?: string;
}

export function signPlatformJwt(
  claims: Omit<PlatformJwtClaims, 'aud' | 'exp' | 'iat' | 'iss'>,
  options: PlatformJwtSigningOptions,
): string {
  const nowEpochSeconds = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const payload: PlatformJwtClaims = {
    ...claims,
    aud: options.audience,
    exp: nowEpochSeconds + (options.expiresInSeconds ?? 3600),
    iat: nowEpochSeconds,
    iss: options.issuer,
  };

  const header: JwtHeader = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`, options.secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyPlatformJwt(
  token: string,
  options: PlatformJwtVerificationOptions,
): AuthenticatedPrincipalClaims {
  const tokenParts = token.split('.');

  if (tokenParts.length !== 3) {
    throw new Error('Token must contain header, payload, and signature.');
  }

  const [encodedHeader, encodedPayload, providedSignature] = tokenParts;
  const header = decodeJson<JwtHeader>(encodedHeader);
  const payload = decodeJson<PlatformJwtClaims>(encodedPayload);

  if (header.alg !== 'HS256') {
    throw new Error('Unsupported token algorithm.');
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`, options.secret);

  if (!safeEqual(expectedSignature, providedSignature)) {
    throw new Error('Token signature is invalid.');
  }

  if (payload.iss !== options.issuer) {
    throw new Error('Token issuer is invalid.');
  }

  if (!audienceMatches(payload.aud, options.audience)) {
    throw new Error('Token audience is invalid.');
  }

  const nowEpochSeconds = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);

  if (typeof payload.nbf === 'number' && payload.nbf > nowEpochSeconds) {
    throw new Error('Token is not active yet.');
  }

  if (typeof payload.exp === 'number' && payload.exp <= nowEpochSeconds) {
    throw new Error('Token has expired.');
  }

  if (!payload.sub || payload.sub.trim().length === 0) {
    throw new Error('Token subject is required.');
  }

  const roles = (payload.roles ?? payload.platform_roles ?? [])
    .map((role) => role.trim().toLowerCase())
    .filter(isPlatformRole);

  return {
    personId: payload.person_id,
    roles,
    userId: payload.sub,
  };
}

function audienceMatches(audience: string | string[] | undefined, expectedAudience: string): boolean {
  if (typeof audience === 'string') {
    return audience === expectedAudience;
  }

  if (Array.isArray(audience)) {
    return audience.includes(expectedAudience);
  }

  return false;
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch (error) {
    throw new Error('Token payload is malformed.');
  }
}
