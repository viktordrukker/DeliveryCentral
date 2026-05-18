import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

import { appRouter } from './router';
import { AuthProvider } from './auth-context';
import { PlatformSettingsProvider } from './platform-settings-context';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { apiClientConfig } from '@/lib/api/config';
import { setColorModePreference } from '@/styles/design-tokens';
import { Button, Modal } from '@/components/ds';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Sprint F-0.8 (B-13 / D-87) — polling-based notification count updates.
// The previous SSE path (`/notifications/inbox/stream`) returned 503 in
// Phase 4 walker capture, so the FE silently retried every 60s and produced
// network/console noise. Polling is cheaper to operate at v1 scale (20–100
// IT-block users) and removes the broken endpoint's surface area.
//
// 30s is the same cadence the previous SSE event-emission used, so user-
// perceived latency is unchanged.
const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function setDarkMode(value: boolean): void {
  setColorModePreference(value ? 'dark' : 'light');
}

const SHORTCUTS = [
  { key: '/', description: 'Focus filter bar' },
  { key: '?', description: 'Show this help overlay' },
  { key: 'Cmd+K', description: 'Open command palette' },
  { key: 'Esc', description: 'Close modal / overlay' },
];

/**
 * Sprint F-0.8 (B-13 / D-87) — poll the unread-count endpoint every 30s and
 * dispatch the same `notifications:count-update` event the bell components
 * already listen for. Replaces the previous SSE attempt that 503'd silently.
 */
function useNotificationPolling(): void {
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce(): Promise<void> {
      const token =
        localStorage.getItem(apiClientConfig.authTokenStorageKey) ??
        sessionStorage.getItem(apiClientConfig.authTokenStorageKey);
      if (!token) {
        scheduleNext();
        return;
      }
      try {
        const response = await fetch(
          `${apiClientConfig.baseUrl}/notifications/inbox/unread-count`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (response.ok) {
          const payload = (await response.json()) as { unreadCount?: number };
          window.dispatchEvent(
            new CustomEvent('notifications:count-update', { detail: payload }),
          );
        }
      } catch {
        // network error — try again at the next interval; no console spam.
      }
      scheduleNext();
    }

    function scheduleNext(): void {
      if (!active) return;
      timer = setTimeout(() => void fetchOnce(), NOTIFICATION_POLL_INTERVAL_MS);
    }

    void fetchOnce();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
}

export function App(): JSX.Element {
  const [showShortcuts, setShowShortcuts] = useState(false);
  useNotificationPolling();

  useEffect(() => {
    const handler = (): void => {
      toast.warning('Your session will expire in 2 minutes. Save your work.', { duration: 10000 });
    };

    window.addEventListener('auth:session-expiring-soon', handler);

    return () => window.removeEventListener('auth:session-expiring-soon', handler);
  }, []);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }
      if (inInput) return;

      if (e.key === '/') {
        const filterInput = document.querySelector<HTMLInputElement>('.filter-bar input');
        if (!filterInput) return;
        e.preventDefault();
        filterInput.focus();
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []);

  return (
    <>
      {DEMO_MODE ? (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            zIndex: 9999,
            background: '#1d4ed8',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Demo Mode — data is read-only and resets periodically
        </div>
      ) : null}
      <ErrorBoundary>
        {/* F-22 / CC-10 — single AuthProvider above the router so it
            survives /login → / transitions. Previously each top-level
            route mounted its own AuthProvider, which triggered redundant
            `/auth/me` + `/auth/refresh` calls on every login-to-dashboard
            hop and made the per-instance `initComplete.current` ref
            ineffective across route changes. PlatformSettingsProvider
            stays just below — it depends on auth via the window event
            bus, not React context, so order between the two is purely
            ergonomic (see CC-11 doc in platform-settings-context.tsx). */}
        <AuthProvider>
          <PlatformSettingsProvider>
            <RouterProvider router={appRouter} future={{ v7_startTransition: true }} />
          </PlatformSettingsProvider>
        </AuthProvider>
      </ErrorBoundary>
      <Toaster position="bottom-right" richColors />
      <Modal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
        title="Keyboard Shortcuts"
        size="sm"
        footer={
          <Button variant="secondary" onClick={() => setShowShortcuts(false)}>
            Close
          </Button>
        }
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map(({ key, description }) => (
              <tr key={key}>
                <td style={{ padding: '4px 8px 4px 0', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {key}
                </td>
                <td style={{ padding: '4px 0', color: 'var(--color-text-muted)' }}>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Modal>
    </>
  );
}
