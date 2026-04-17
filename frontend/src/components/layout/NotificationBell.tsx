import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { fetchInbox, markAllRead, markNotificationRead, InAppNotification } from '@/lib/api/inbox';

const POLL_INTERVAL_MS = 30_000;

function eventIcon(eventType: string): string {
  if (eventType.startsWith('case.')) return '📋';
  if (eventType.startsWith('assignment.')) return '👤';
  if (eventType.startsWith('project.')) return '📁';
  return '🔔';
}

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function groupNotifications(items: InAppNotification[]): Array<{ label: string; items: InAppNotification[] }> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayStr = today.toDateString();
  const yesterdayStr = yesterday.toDateString();

  const groups: Record<string, InAppNotification[]> = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };

  for (const item of items) {
    const d = new Date(item.createdAt).toDateString();
    const itemDate = new Date(item.createdAt);
    if (d === todayStr) groups.Today.push(item);
    else if (d === yesterdayStr) groups.Yesterday.push(item);
    else if (itemDate >= weekAgo) groups['This Week'].push(item);
    else groups.Earlier.push(item);
  }

  return Object.entries(groups)
    .filter(([, v]) => v.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function NotificationBell(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function loadNotifications(): Promise<void> {
    try {
      const data = await fetchInbox({ limit: 20 });
      setNotifications(data);
    } catch {
      // Silently fail — notifications are non-critical
    }
  }

  useEffect(() => {
    void loadNotifications();
    const timer = setInterval(() => void loadNotifications(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // Listen for real-time SSE count updates and refresh when count increases
  useEffect(() => {
    let prevCount = 0;

    function handleCountUpdate(event: Event): void {
      const e = event as CustomEvent<{ unreadCount?: number }>;
      const newCount = e.detail?.unreadCount ?? 0;
      if (newCount > prevCount) {
        void loadNotifications();
        toast.info('You have new notifications', { duration: 3000 });
      }
      prevCount = newCount;
    }

    window.addEventListener('notifications:count-update', handleCountUpdate);
    return () => window.removeEventListener('notifications:count-update', handleCountUpdate);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleMarkRead(id: string): Promise<void> {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead(): Promise<void> {
    try {
      await markAllRead();
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? now })),
      );
    } catch {
      // ignore
    }
  }

  async function handleNotificationClick(notification: InAppNotification): Promise<void> {
    if (!notification.readAt) {
      await handleMarkRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setOpen(false);
  }

  return (
    <div className="notification-bell" ref={panelRef} style={{ position: 'relative' }}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="notification-bell__trigger"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          position: 'relative',
          fontSize: '20px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
        type="button"
      >
        🔔
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="notification-bell__badge"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'var(--color-status-danger)',
              color: '#fff',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 700,
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-bell__panel"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '360px',
            maxHeight: '400px',
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              position: 'sticky',
              top: 0,
              background: 'var(--color-surface)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => void handleMarkAllRead()}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: 'var(--color-accent)',
                  padding: 0,
                }}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              No notifications
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {groupNotifications(notifications).map(({ label, items }) => (
                <li key={label}>
                  <div style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-subtle)', textTransform: 'uppercase', background: 'var(--color-surface-alt)' }}>
                    {label}
                  </div>
                  {items.map((notification) => (
                <li
                  key={notification.id}
                  style={{
                    borderLeft: notification.readAt ? 'none' : '3px solid var(--color-accent)',
                    background: notification.readAt ? 'transparent' : 'var(--color-accent-soft)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <button
                    type="button"
                    style={{
                      display: 'flex',
                      gap: '10px',
                      padding: '10px 12px',
                      cursor: notification.link ? 'pointer' : 'default',
                      alignItems: 'flex-start',
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                    onClick={() => void handleNotificationClick(notification)}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>
                      {eventIcon(notification.eventType)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: notification.readAt ? 400 : 600,
                          fontSize: '13px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.title}
                      </div>
                      {notification.body && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            whiteSpace: 'normal',
                            marginTop: '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {notification.body}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '4px' }}>
                        {relativeTime(notification.createdAt)}
                      </div>
                    </div>
                    {!notification.readAt && (
                      <button
                        aria-label="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleMarkRead(notification.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          fontSize: '14px',
                          flexShrink: 0,
                          padding: '0 4px',
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </button>
                </li>
              ))}
                </li>
              ))}
            </ul>
          )}

          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <Link
              onClick={() => setOpen(false)}
              style={{ fontSize: '13px', color: 'var(--color-accent)', textDecoration: 'none' }}
              to="/notifications"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
