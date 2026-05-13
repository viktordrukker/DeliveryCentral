import { Injectable, Logger } from '@nestjs/common';
import { Client, type Entry } from 'ldapts';

/**
 * F-4.7 / NEW C1-LDAP — bank-AD / LDAP directory adapter.
 *
 * Pulls user objects + manager hierarchy + group membership from a
 * bind-and-search LDAP source (Active Directory, OpenLDAP, FreeIPA,
 * etc.). Maps the bank's AD groups to platform roles via a configurable
 * `LDAP_GROUP_ROLE_MAP` JSON (e.g. `{ "CN=DC-Admins,OU=Groups,DC=bank,DC=local": "admin" }`).
 *
 * Pairs with the existing M365 adapter for tenants that prefer on-prem
 * AD over Entra Cloud directory. The runtime cost of running both is
 * effectively zero — the unconfigured one stays inert.
 *
 * Scope of this PR: the adapter contract + the `ldapts`-backed bind /
 * search / unmap-attribute path + a reachability probe. Outbox event
 * wiring (auto-fire on first connect + scheduled cron sweep) lands in
 * a follow-up so this PR keeps the diff narrow.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const PROBE_TIMEOUT_MS = 2_000;

export interface LdapUserRecord {
  /** AD `objectGUID` or OpenLDAP `entryUUID` — the canonical primary key. */
  externalId: string;
  /** Login name (sAMAccountName / uid). */
  username: string;
  displayName: string;
  email: string | null;
  /** distinguishedName of the user's `manager` attribute when present. */
  managerDn: string | null;
  /** Group distinguishedNames the user is a `memberOf`. */
  groupDns: string[];
  /** Mapped platform roles after applying groupRoleMap. */
  mappedRoles: string[];
  /** Disabled / archived in source directory? */
  disabled: boolean;
}

export interface LdapProbeResult {
  configured: boolean;
  reachable: boolean;
  latencyMs: number | null;
  error?: string;
}

export interface LdapSyncOptions {
  /** Limit the result set (handy during dev / smoke tests). */
  limit?: number;
}

@Injectable()
export class LdapDirectoryAdapter {
  private readonly logger = new Logger(LdapDirectoryAdapter.name);
  private readonly url = process.env.LDAP_URL ?? null;
  private readonly bindDn = process.env.LDAP_BIND_DN ?? null;
  private readonly bindPassword = process.env.LDAP_BIND_PASSWORD ?? null;
  private readonly userBaseDn = process.env.LDAP_USER_BASE_DN ?? null;
  private readonly userFilter = process.env.LDAP_USER_FILTER ?? '(objectClass=person)';
  private readonly groupRoleMap = this.parseGroupRoleMap(process.env.LDAP_GROUP_ROLE_MAP);

  public isConfigured(): boolean {
    return this.url !== null && this.bindDn !== null && this.bindPassword !== null && this.userBaseDn !== null;
  }

  public async probe(): Promise<LdapProbeResult> {
    if (!this.isConfigured()) {
      return { configured: false, reachable: false, latencyMs: null };
    }
    const startedAt = Date.now();
    const client = new Client({ url: this.url!, timeout: PROBE_TIMEOUT_MS, connectTimeout: PROBE_TIMEOUT_MS });
    try {
      await client.bind(this.bindDn!, this.bindPassword!);
      return { configured: true, reachable: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        latencyMs: null,
        error: error instanceof Error ? error.message : 'Unknown LDAP probe error.',
      };
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  public async fetchUsers(options: LdapSyncOptions = {}): Promise<LdapUserRecord[]> {
    if (!this.isConfigured()) {
      throw new Error('LDAP is not configured; cannot fetch users.');
    }
    const client = new Client({ url: this.url!, timeout: DEFAULT_TIMEOUT_MS });
    try {
      await client.bind(this.bindDn!, this.bindPassword!);
      const { searchEntries } = await client.search(this.userBaseDn!, {
        filter: this.userFilter,
        scope: 'sub',
        sizeLimit: options.limit ?? 1000,
        attributes: [
          'objectGUID',
          'entryUUID',
          'sAMAccountName',
          'uid',
          'displayName',
          'cn',
          'mail',
          'manager',
          'memberOf',
          'userAccountControl',
          'pwdAccountLockedTime',
        ],
      });
      return searchEntries.map((entry) => this.mapUserEntry(entry));
    } finally {
      await client.unbind().catch(() => undefined);
    }
  }

  private mapUserEntry(entry: Entry): LdapUserRecord {
    const objectGuid = readString(entry, 'objectGUID');
    const entryUuid = readString(entry, 'entryUUID');
    const externalId = objectGuid ?? entryUuid ?? entry.dn;

    const username =
      readString(entry, 'sAMAccountName') ?? readString(entry, 'uid') ?? entry.dn;
    const displayName =
      readString(entry, 'displayName') ?? readString(entry, 'cn') ?? username;
    const email = readString(entry, 'mail');
    const managerDn = readString(entry, 'manager');
    const groupDns = readArray(entry, 'memberOf');
    const mappedRoles = Array.from(
      new Set(
        groupDns
          .map((dn) => this.groupRoleMap[dn] ?? null)
          .filter((role): role is string => role !== null),
      ),
    );
    const disabled = this.computeDisabled(entry);

    return { externalId, username, displayName, email, managerDn, groupDns, mappedRoles, disabled };
  }

  /**
   * AD: `userAccountControl` bit 2 (0x0002) = ACCOUNTDISABLE.
   * OpenLDAP / FreeIPA: presence of `pwdAccountLockedTime`.
   */
  private computeDisabled(entry: Entry): boolean {
    const uac = readString(entry, 'userAccountControl');
    if (uac) {
      const value = Number.parseInt(uac, 10);
      if (Number.isFinite(value) && (value & 0x0002) !== 0) return true;
    }
    const lockedAt = readString(entry, 'pwdAccountLockedTime');
    if (lockedAt && lockedAt !== '000001010000Z') return true;
    return false;
  }

  private parseGroupRoleMap(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch (error) {
      this.logger.warn(
        `LDAP_GROUP_ROLE_MAP is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return {};
  }
}

function readString(entry: Entry, key: string): string | null {
  const value = entry[key];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') return value[0];
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return null;
}

function readArray(entry: Entry, key: string): string[] {
  const value = entry[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') return [value];
  return [];
}
