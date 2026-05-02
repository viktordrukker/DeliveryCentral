import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

const TOKEN_FILE_PATH = process.env.SETUP_TOKEN_PATH ?? '/opt/deliverycentral-data/.setup-token';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface ActiveToken {
  token: string;
  issuedAt: number;
  expiresAt: number;
}

/**
 * One-time bootstrap secret printed to backend logs at first boot. Required
 * as `X-Setup-Token` header on every /setup/* request until the wizard
 * completes (or 24h elapses, whichever first).
 *
 * Generated when:
 *   - The setup_runs table is empty AND
 *   - No LocalAccount with role=admin exists yet, OR CLEAN_INSTALL=true is set
 *
 * Persisted to:
 *   - In-memory (this service)
 *   - Container stdout via NestJS Logger (-> docker logs)
 *   - /opt/deliverycentral-data/.setup-token file (root-readable on host)
 */
@Injectable()
export class SetupTokenService {
  private readonly logger = new Logger('setup-token');
  private active: ActiveToken | null = null;

  /** Returns the existing active token, or generates + persists a new one. */
  public async issue(): Promise<string> {
    if (this.active && Date.now() < this.active.expiresAt) {
      return this.active.token;
    }

    const token = randomBytes(32).toString('hex'); // 64-char hex
    const issuedAt = Date.now();
    this.active = { token, issuedAt, expiresAt: issuedAt + TOKEN_TTL_MS };

    // 1. stdout — visible in `docker logs <c> | grep SETUP_TOKEN`
    this.logger.warn(`SETUP_TOKEN issued (24h TTL): ${token}`);
    this.logger.warn(
      'Hand this token to the operator running the install wizard. It must be supplied in the X-Setup-Token header on every /setup/* request.',
    );

    // 2. file on host — best-effort, swallowed if path is unwritable
    try {
      await fs.mkdir(path.dirname(TOKEN_FILE_PATH), { recursive: true });
      await fs.writeFile(TOKEN_FILE_PATH, token, { mode: 0o600 });
    } catch (err) {
      this.logger.warn(
        `Could not write setup token to ${TOKEN_FILE_PATH}: ${
          err instanceof Error ? err.message : String(err)
        } — token is still readable from container logs.`,
      );
    }

    return token;
  }

  /** Constant-time-ish equality check + freshness check. */
  public verify(presented: string | undefined | null): boolean {
    if (!this.active || !presented) return false;
    if (Date.now() >= this.active.expiresAt) return false;
    if (presented.length !== this.active.token.length) return false;

    let mismatch = 0;
    for (let i = 0; i < presented.length; i++) {
      mismatch |= presented.charCodeAt(i) ^ this.active.token.charCodeAt(i);
    }
    return mismatch === 0;
  }

  /** Called after the wizard's `complete` step lands. New token only on Reset. */
  public async invalidate(): Promise<void> {
    this.active = null;
    try {
      await fs.unlink(TOKEN_FILE_PATH);
    } catch {
      // file may not exist; fine.
    }
  }

  /** Active token presence — used by /setup-status to tell the UI whether to show the token-prompt screen. */
  public isActive(): boolean {
    return this.active !== null && Date.now() < this.active.expiresAt;
  }
}
