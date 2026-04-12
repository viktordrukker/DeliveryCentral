import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { toast, Toaster } from 'sonner';

import { appRouter } from './router';
import { apiClientConfig } from '@/lib/api/config';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
const DARK_MODE_KEY = 'dc:dark-mode';

function getInitialTheme(): 'dark' | 'light' | null {
  const stored = localStorage.getItem(DARK_MODE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return null; // rely on prefers-color-scheme via CSS
}

function applyTheme(theme: 'dark' | 'light' | null): void {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function setDarkMode(value: boolean): void {
  const theme = value ? 'dark' : 'light';
  localStorage.setItem(DARK_MODE_KEY, theme);
  applyTheme(theme);
}

const SHORTCUTS = [
  { key: '/', description: 'Focus filter bar' },
  { key: '?', description: 'Show this help overlay' },
  { key: 'Cmd+K', description: 'Open command palette' },
  { key: 'Esc', description: 'Close modal / overlay' },
];

/** Connect to the notifications SSE stream and dispatch count-update events */
function useNotificationStream(): void {
  useEffect(() => {
    let controller: AbortController | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    async function connect(): Promise<void> {
      const token =
        localStorage.getItem(apiClientConfig.authTokenStorageKey) ??
        sessionStorage.getItem(apiClientConfig.authTokenStorageKey);
      if (!token) return;

      controller = new AbortController();
      try {
        const response = await fetch(`${apiClientConfig.baseUrl}/notifications/inbox/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const payload = JSON.parse(line.slice(5).trim()) as { unreadCount?: number };
                window.dispatchEvent(
                  new CustomEvent('notifications:count-update', { detail: payload }),
                );
              } catch {
                // ignore malformed
              }
            }
          }
        }
      } catch {
        // ignore abort or network errors
      }

      // Reconnect after 60s if not aborted
      if (!controller?.signal.aborted) {
        retryTimeout = setTimeout(() => void connect(), 60_000);
      }
    }

    void connect();

    return () => {
      controller?.abort();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);
}

export function App(): JSX.Element {
  const [showShortcuts, setShowShortcuts] = useState(false);
  useNotificationStream();

  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);
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
      <RouterProvider router={appRouter} />
      <Toaster position="bottom-right" richColors />
      {showShortcuts ? (
        <div
          aria-modal="true"
          className="confirm-dialog-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShortcuts(false); }}
          role="dialog"
        >
          <div className="confirm-dialog" style={{ minWidth: 320 }}>
            <h3 className="confirm-dialog__title">Keyboard Shortcuts</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <tbody>
                {SHORTCUTS.map(({ key, description }) => (
                  <tr key={key}>
                    <td style={{ padding: '4px 8px 4px 0', fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {key}
                    </td>
                    <td style={{ padding: '4px 0', color: '#6b7280' }}>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="confirm-dialog__actions">
              <button className="button button--secondary" onClick={() => setShowShortcuts(false)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
