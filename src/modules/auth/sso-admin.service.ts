import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { AppConfig } from '@src/shared/config/app-config';

/**
 * NEW-LGL-2 — bank-ops self-serve SSO admin.
 *
 * Persists OIDC config in PlatformSettings under the `sso.*` keys:
 *   - `sso.provider`            (string) provider preset: 'google' | 'azure_ad' | 'okta' | 'oidc'
 *   - `sso.clientId`            (string) IdP client id
 *   - `sso.discoveryUrl`        (string) IdP discovery document URL
 *   - `sso.clientSecretEncrypted` (string) AES-256-GCM ciphertext of the client secret
 *   - `sso.autoProvisionUsers`  (boolean) auto-create LocalAccount on first sign-in
 *
 * `sso.idp.*` keys consumed by `OidcService` are mirrored on every PUT so a
 * Save here is a Save there. The secret is encrypted-at-rest with a key
 * derived from `AppConfig.authJwtSecret`; GET responses mask the secret to
 * a sentinel ('***') if one is set.
 */
export type SsoProvider = 'google' | 'azure_ad' | 'okta' | 'oidc';

export interface SsoConfig {
  provider: SsoProvider;
  clientId: string;
  discoveryUrl: string;
  clientSecretSet: boolean;
  autoProvisionUsers: boolean;
}

export interface SsoUpdateInput {
  provider: SsoProvider;
  clientId: string;
  discoveryUrl: string;
  /**
   * Plaintext client secret. Omit (undefined) to leave the stored secret
   * unchanged; pass `''` to clear it.
   */
  clientSecret?: string;
  autoProvisionUsers: boolean;
}

export interface SsoTestResult {
  ok: boolean;
  issuer?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  error?: string;
}

const ENC_PREFIX = 'enc:v1:';

@Injectable()
export class SsoAdminService {
  private readonly logger = new Logger(SsoAdminService.name);

  public constructor(
    private readonly platformSettings: PlatformSettingsService,
    private readonly appConfig: AppConfig,
  ) {}

  public async getConfig(): Promise<SsoConfig> {
    const provider = this.coerceProvider(
      await this.platformSettings.getRawValue('sso.provider'),
    );
    const clientId = this.asString(await this.platformSettings.getRawValue('sso.clientId'));
    const discoveryUrl = this.asString(
      await this.platformSettings.getRawValue('sso.discoveryUrl'),
    );
    const encryptedSecret = this.asString(
      await this.platformSettings.getRawValue('sso.clientSecretEncrypted'),
    );
    const autoProvisionUsers = Boolean(
      await this.platformSettings.getRawValue('sso.autoProvisionUsers'),
    );

    return {
      provider,
      clientId: clientId ?? '',
      discoveryUrl: discoveryUrl ?? '',
      clientSecretSet: encryptedSecret !== null && encryptedSecret.length > 0,
      autoProvisionUsers,
    };
  }

  public async updateConfig(input: SsoUpdateInput, actorId: string | null): Promise<SsoConfig> {
    if (input.clientId.length > 0 && input.discoveryUrl.length === 0) {
      throw new BadRequestException('discoveryUrl is required when clientId is set.');
    }
    if (input.discoveryUrl.length > 0) {
      try {
        // Sanity-check shape so we fail fast before any write.
        const url = new URL(input.discoveryUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') {
          throw new Error('protocol');
        }
      } catch {
        throw new BadRequestException('discoveryUrl must be a valid http(s) URL.');
      }
    }

    const provider = this.coerceProvider(input.provider);

    await this.platformSettings.updateKey('sso.provider', provider, actorId ?? undefined);
    await this.platformSettings.updateKey('sso.clientId', input.clientId, actorId ?? undefined);
    await this.platformSettings.updateKey(
      'sso.discoveryUrl',
      input.discoveryUrl,
      actorId ?? undefined,
    );
    await this.platformSettings.updateKey(
      'sso.autoProvisionUsers',
      input.autoProvisionUsers,
      actorId ?? undefined,
    );

    if (typeof input.clientSecret === 'string') {
      const ciphertext = input.clientSecret.length > 0 ? this.encrypt(input.clientSecret) : '';
      await this.platformSettings.updateKey(
        'sso.clientSecretEncrypted',
        ciphertext,
        actorId ?? undefined,
      );
    }

    // Mirror to legacy `sso.idp.*` keys consumed by OidcService so the live
    // OIDC handler picks up the new config without a restart.
    const plainSecret = await this.getClientSecret();
    await this.platformSettings.updateKey(
      'sso.idp.issuerUrl',
      input.discoveryUrl,
      actorId ?? undefined,
    );
    await this.platformSettings.updateKey(
      'sso.idp.clientId',
      input.clientId,
      actorId ?? undefined,
    );
    await this.platformSettings.updateKey(
      'sso.idp.clientSecret',
      plainSecret ?? '',
      actorId ?? undefined,
    );
    await this.platformSettings.updateKey(
      'sso.idp.source',
      provider,
      actorId ?? undefined,
    );

    return this.getConfig();
  }

  /**
   * Hit the configured discovery URL and verify it returns a valid OIDC
   * issuer document. Used by the "Test connection" button on the admin UI.
   */
  public async testConnection(): Promise<SsoTestResult> {
    const discoveryUrl = this.asString(
      await this.platformSettings.getRawValue('sso.discoveryUrl'),
    );
    if (!discoveryUrl) {
      return { ok: false, error: 'discoveryUrl is not configured.' };
    }

    let parsed: URL;
    try {
      parsed = new URL(discoveryUrl);
    } catch {
      return { ok: false, error: 'discoveryUrl is not a valid URL.' };
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { ok: false, error: 'discoveryUrl protocol must be http(s).' };
    }

    let response: Response;
    try {
      response = await fetch(discoveryUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Discovery fetch failed: ${message}` };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: `Discovery endpoint returned HTTP ${response.status}.`,
      };
    }

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      return { ok: false, error: 'Discovery document is not valid JSON.' };
    }

    const issuer = typeof body.issuer === 'string' ? body.issuer : null;
    const authorizationEndpoint =
      typeof body.authorization_endpoint === 'string' ? body.authorization_endpoint : null;
    const tokenEndpoint = typeof body.token_endpoint === 'string' ? body.token_endpoint : null;

    if (!issuer || !authorizationEndpoint || !tokenEndpoint) {
      return {
        ok: false,
        error: 'Discovery document missing required fields (issuer, authorization_endpoint, token_endpoint).',
      };
    }

    return {
      ok: true,
      issuer,
      authorizationEndpoint,
      tokenEndpoint,
    };
  }

  /**
   * Returns the plaintext client secret if one is stored, else null. Used
   * internally by `updateConfig` to mirror to the legacy `sso.idp.*` keys.
   */
  private async getClientSecret(): Promise<string | null> {
    const encrypted = this.asString(
      await this.platformSettings.getRawValue('sso.clientSecretEncrypted'),
    );
    if (!encrypted) return null;
    try {
      return this.decrypt(encrypted);
    } catch (err) {
      this.logger.warn(
        `Failed to decrypt sso.clientSecretEncrypted: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private encrypt(plaintext: string): string {
    const key = this.deriveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return (
      ENC_PREFIX +
      Buffer.concat([iv, tag, ciphertext]).toString('base64')
    );
  }

  private decrypt(value: string): string {
    if (!value.startsWith(ENC_PREFIX)) {
      throw new Error('Unrecognized ciphertext prefix.');
    }
    const blob = Buffer.from(value.slice(ENC_PREFIX.length), 'base64');
    const iv = blob.subarray(0, 12);
    const tag = blob.subarray(12, 28);
    const ciphertext = blob.subarray(28);
    const key = this.deriveKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
  }

  private deriveKey(): Buffer {
    return createHash('sha256').update(this.appConfig.authJwtSecret).digest();
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private coerceProvider(value: unknown): SsoProvider {
    switch (value) {
      case 'google':
      case 'azure_ad':
      case 'okta':
      case 'oidc':
        return value;
      default:
        return 'oidc';
    }
  }
}
