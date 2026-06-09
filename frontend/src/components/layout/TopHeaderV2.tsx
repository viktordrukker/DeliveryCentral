import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useImpersonation } from '@/app/impersonation-context';
import { ADMIN_ROLES, ROLE_PRIORITY, hasAnyRole } from '@/app/route-manifest';
import { CommandPalette } from '@/components/common/CommandPalette';
import { Avatar } from '@/components/ds/Avatar';
import { fetchAdminAccounts, AdminAccountItem } from '@/lib/api/admin';
import { NotificationBell } from './NotificationBell';

function topRole(roles: string[]): string {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0] ?? 'user';
}

function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TopHeaderV2Props {
  /** Mobile hamburger handler — toggles the sidebar collapsed state. */
  onToggleSidebar?: () => void;
}

/**
 * Phase A2.3 — DS-redesign top header (DS/chrome.jsx:68-86).
 *
 * Differences from `TopHeader`:
 *   - ⌘K search input opens `CommandPalette`
 *   - "+ New" button surfaces a quick-create menu
 *   - Help icon links to `/help`
 *   - User block uses DS `<Avatar>` instead of MUI Chip stack
 *
 * Gated by `dsRefresh`; AppShell renders this when the flag is on
 * and the original `TopHeader` when it is off (Phase A2.4).
 */
export function TopHeaderV2({ onToggleSidebar }: TopHeaderV2Props): JSX.Element {
  const { principal, logout } = useAuth();
  const { impersonation, startImpersonation, exitImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const isAdmin = hasAnyRole(principal?.roles, ADMIN_ROLES);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void fetchAdminAccounts(1, 100)
      .then((r) => {
        if (active) setAccounts(r.items.filter((a: AdminAccountItem) => a.personId));
      })
      .catch(() => {
        /* admin accounts unavailable — fall back to no `view as` selector */
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent): void {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setNewMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  function handleViewAs(e: React.ChangeEvent<HTMLSelectElement>): void {
    const accountId = e.target.value;
    if (!accountId) {
      exitImpersonation();
      return;
    }
    const account = accounts.find((a) => a.id === accountId);
    if (account && account.personId) {
      startImpersonation({
        displayName: account.displayName,
        personId: account.personId,
        roles: account.roles,
      });
    }
  }

  function newAction(href: string): () => void {
    return () => {
      setNewMenuOpen(false);
      navigate(href);
    };
  }

  const displayName = impersonation?.displayName ?? principal?.displayName ?? '';
  const displayRole = topRole(impersonation?.roles ?? principal?.roles ?? []);

  return (
    <>
      <header className="top-header top-header--v2">
        {onToggleSidebar ? (
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="top-header__hamburger"
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: 18,
              padding: '0 8px',
            }}
          >
            ☰
          </button>
        ) : null}
        <button
          type="button"
          className="top-header__search"
          onClick={() => setPaletteOpen(true)}
          aria-label="Open command palette"
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            padding: '6px 10px',
            minWidth: 240,
          }}
        >
          <span aria-hidden="true">⌕</span>
          <span style={{ flex: 1, textAlign: 'left' }}>Search…</span>
          <kbd
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 3,
              fontSize: 10,
              padding: '1px 4px',
              color: 'var(--color-text-subtle)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="top-header__actions" style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="button button--primary button--sm"
              onClick={() => setNewMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={newMenuOpen}
            >
              + New
            </button>
            {newMenuOpen ? (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  boxShadow: 'var(--shadow-dropdown)',
                  minWidth: 200,
                  padding: 4,
                  zIndex: 50,
                }}
              >
                {[
                  { label: 'New project', href: '/projects/new' },
                  { label: 'New position', href: '/staffing-requests/new' },
                  { label: 'New leave request', href: '/leave/new' },
                ].map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    role="menuitem"
                    onClick={newAction(item.href)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      display: 'block',
                      fontSize: 13,
                      padding: '6px 10px',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <NotificationBell />

          <button
            type="button"
            aria-label="Help"
            className="top-header__help"
            onClick={() => navigate('/help')}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 999,
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: 12,
              height: 26,
              width: 26,
            }}
          >
            ?
          </button>

          {isAdmin && accounts.length > 0 ? (
            <select
              className="field__control"
              onChange={handleViewAs}
              style={{ maxWidth: 180, fontSize: 12, height: 30 }}
              title="View the app as another user"
              value={accounts.find((a) => a.personId === impersonation?.personId)?.id ?? ''}
            >
              <option value="">View as…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.roles.map(roleLabel).join(', ')})
                </option>
              ))}
            </select>
          ) : null}

          {principal ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={displayName} size="sm" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{displayName}</span>
                <span style={{ fontSize: 10, color: impersonation ? 'var(--color-status-warning)' : 'var(--color-text-muted)' }}>
                  {roleLabel(displayRole)}
                  {impersonation ? ' · impersonating' : ''}
                </span>
              </div>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={() => void handleLogout()}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
