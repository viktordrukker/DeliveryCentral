import { LdapDirectoryAdapter } from '@src/shared/ldap/ldap-directory-adapter';

describe('LdapDirectoryAdapter (F-4.7 / NEW C1-LDAP)', () => {
  const originalEnv = {
    LDAP_URL: process.env.LDAP_URL,
    LDAP_BIND_DN: process.env.LDAP_BIND_DN,
    LDAP_BIND_PASSWORD: process.env.LDAP_BIND_PASSWORD,
    LDAP_USER_BASE_DN: process.env.LDAP_USER_BASE_DN,
    LDAP_GROUP_ROLE_MAP: process.env.LDAP_GROUP_ROLE_MAP,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function clearEnv(): void {
    delete process.env.LDAP_URL;
    delete process.env.LDAP_BIND_DN;
    delete process.env.LDAP_BIND_PASSWORD;
    delete process.env.LDAP_USER_BASE_DN;
    delete process.env.LDAP_GROUP_ROLE_MAP;
  }

  it('reports unconfigured when env vars are absent', async () => {
    clearEnv();
    const adapter = new LdapDirectoryAdapter();
    expect(adapter.isConfigured()).toBe(false);
    const probe = await adapter.probe();
    expect(probe).toEqual({ configured: false, reachable: false, latencyMs: null });
  });

  it('throws on fetchUsers when unconfigured', async () => {
    clearEnv();
    const adapter = new LdapDirectoryAdapter();
    await expect(adapter.fetchUsers()).rejects.toThrow(/LDAP is not configured/);
  });

  it('reports configured=true when all env vars present (probe network failure tolerated)', async () => {
    process.env.LDAP_URL = 'ldap://nope.invalid:389';
    process.env.LDAP_BIND_DN = 'CN=svc,DC=bank,DC=local';
    process.env.LDAP_BIND_PASSWORD = 'pass';
    process.env.LDAP_USER_BASE_DN = 'OU=People,DC=bank,DC=local';
    const adapter = new LdapDirectoryAdapter();
    expect(adapter.isConfigured()).toBe(true);
    const probe = await adapter.probe();
    expect(probe.configured).toBe(true);
    // No server listening — bind throws; probe reports unreachable.
    expect(probe.reachable).toBe(false);
    expect(typeof probe.error).toBe('string');
  });

  it('parses LDAP_GROUP_ROLE_MAP JSON when valid', () => {
    process.env.LDAP_URL = 'ldap://x';
    process.env.LDAP_BIND_DN = 'cn=svc';
    process.env.LDAP_BIND_PASSWORD = 'pw';
    process.env.LDAP_USER_BASE_DN = 'ou=People';
    process.env.LDAP_GROUP_ROLE_MAP = JSON.stringify({
      'CN=DC-Admins,DC=bank,DC=local': 'admin',
      'CN=DC-PMs,DC=bank,DC=local': 'project_manager',
    });
    const adapter = new LdapDirectoryAdapter();
    // Pure-function check via private field reflection — same pattern as the
    // OIDC service spec.
    const map = (adapter as unknown as { groupRoleMap: Record<string, string> }).groupRoleMap;
    expect(map['CN=DC-Admins,DC=bank,DC=local']).toBe('admin');
    expect(map['CN=DC-PMs,DC=bank,DC=local']).toBe('project_manager');
  });

  it('falls back to empty map when LDAP_GROUP_ROLE_MAP is invalid JSON', () => {
    process.env.LDAP_URL = 'ldap://x';
    process.env.LDAP_BIND_DN = 'cn=svc';
    process.env.LDAP_BIND_PASSWORD = 'pw';
    process.env.LDAP_USER_BASE_DN = 'ou=People';
    process.env.LDAP_GROUP_ROLE_MAP = '{not-json';
    const adapter = new LdapDirectoryAdapter();
    const map = (adapter as unknown as { groupRoleMap: Record<string, string> }).groupRoleMap;
    expect(map).toEqual({});
  });

  it('maps an AD-shaped user entry correctly', () => {
    process.env.LDAP_URL = 'ldap://x';
    process.env.LDAP_BIND_DN = 'cn=svc';
    process.env.LDAP_BIND_PASSWORD = 'pw';
    process.env.LDAP_USER_BASE_DN = 'ou=People';
    process.env.LDAP_GROUP_ROLE_MAP = JSON.stringify({ 'CN=DC-Admins,DC=bank,DC=local': 'admin' });
    const adapter = new LdapDirectoryAdapter();
    const map = (adapter as unknown as { mapUserEntry: (e: unknown) => unknown }).mapUserEntry;

    const entry = {
      dn: 'CN=Lucas Reed,OU=People,DC=bank,DC=local',
      objectGUID: 'abc-1234',
      sAMAccountName: 'lucas.reed',
      displayName: 'Lucas Reed',
      mail: 'lucas.reed@bank.local',
      manager: 'CN=Sophia Kim,OU=People,DC=bank,DC=local',
      memberOf: ['CN=DC-Admins,DC=bank,DC=local', 'CN=Engineering,DC=bank,DC=local'],
      userAccountControl: '512',
    };
    const result = map.call(adapter, entry) as {
      externalId: string;
      username: string;
      mappedRoles: string[];
      disabled: boolean;
      managerDn: string | null;
      groupDns: string[];
    };

    expect(result.externalId).toBe('abc-1234');
    expect(result.username).toBe('lucas.reed');
    expect(result.mappedRoles).toEqual(['admin']);
    expect(result.disabled).toBe(false);
    expect(result.managerDn).toBe('CN=Sophia Kim,OU=People,DC=bank,DC=local');
    expect(result.groupDns.length).toBe(2);
  });

  it('flags AD users disabled when userAccountControl bit-2 is set (514)', () => {
    process.env.LDAP_URL = 'ldap://x';
    process.env.LDAP_BIND_DN = 'cn=svc';
    process.env.LDAP_BIND_PASSWORD = 'pw';
    process.env.LDAP_USER_BASE_DN = 'ou=People';
    const adapter = new LdapDirectoryAdapter();
    const map = (adapter as unknown as { mapUserEntry: (e: unknown) => unknown }).mapUserEntry;

    const entry = {
      dn: 'CN=Former Employee',
      sAMAccountName: 'former.employee',
      userAccountControl: '514',
    };
    const result = map.call(adapter, entry) as { disabled: boolean };
    expect(result.disabled).toBe(true);
  });
});
