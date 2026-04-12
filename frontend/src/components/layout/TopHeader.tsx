import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Typography } from '@mui/material';

import { useAuth } from '@/app/auth-context';
import { useImpersonation } from '@/app/impersonation-context';
import { NotificationBell } from './NotificationBell';
import { fetchAdminAccounts, AdminAccountItem } from '@/lib/api/admin';

const ROLE_PRIORITY = ['admin', 'director', 'hr_manager', 'resource_manager', 'project_manager', 'delivery_manager', 'employee'];

function topRole(roles: string[]): string {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0] ?? 'user';
}

function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TopHeader(): JSX.Element {
  const { principal, logout } = useAuth();
  const { impersonation, startImpersonation, exitImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);

  const isAdmin = principal?.roles.includes('admin') ?? false;

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void fetchAdminAccounts(1, 100).then((r) => {
      if (active) setAccounts(r.items.filter((a: AdminAccountItem) => a.personId));
    }).catch(() => {});
    return () => { active = false; };
  }, [isAdmin]);

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

  return (
    <header className="top-header">
      <div>
        <span className="top-header__label">Environment</span>
        <strong className="top-header__value">
          {import.meta.env.VITE_ENV_LABEL ?? 'Local Development'}
        </strong>
      </div>
      <div className="top-header__actions">
        {principal && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isAdmin && accounts.length > 0 && (
              <select
                className="field__control"
                onChange={handleViewAs}
                style={{ maxWidth: 200, fontSize: '12px', height: 32, padding: '0 8px' }}
                title="View the app as another user"
                value={accounts.find((a) => a.personId === impersonation?.personId)?.id ?? ''}
              >
                <option value="">View as...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} ({a.roles.map(roleLabel).join(', ')})
                  </option>
                ))}
              </select>
            )}
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                {impersonation ? impersonation.displayName : principal.displayName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', mt: 0.25 }}>
                {(impersonation?.roles ?? principal.roles).map((role) => (
                  <Chip
                    key={role}
                    label={roleLabel(role)}
                    size="small"
                    color={impersonation ? 'warning' : 'primary'}
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            </Box>
            <NotificationBell />
            <Button
              variant="outlined"
              size="small"
              onClick={() => void handleLogout()}
            >
              Sign out
            </Button>
          </Box>
        )}
      </div>
    </header>
  );
}
