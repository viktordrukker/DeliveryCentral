import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { fetchInbox, markAllRead, markNotificationRead, InAppNotification } from '@/lib/api/inbox';

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

export function InboxPage(): JSX.Element {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchInbox({ limit: 100 })
      .then((data) => { if (active) { setNotifications(data); setIsLoading(false); } })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load notifications');
          setIsLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

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
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    } catch {
      // ignore
    }
  }

  async function handleClick(notification: InAppNotification): Promise<void> {
    if (!notification.readAt) {
      await handleMarkRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <PageContainer testId="inbox-page">
      <PageHeader
        actions={
          unreadCount > 0 ? (
            <button
              className="button button--secondary"
              onClick={() => void handleMarkAllRead()}
              type="button"
            >
              Mark all as read
            </button>
          ) : null
        }
        eyebrow="Notifications"
        subtitle="Your inbox — all in-app notifications for your account."
        title="Notifications"
      />

      {isLoading ? <LoadingState label="Loading notifications..." variant="skeleton" skeletonType="table" /> : null}
      {error ? <ErrorState description={error} /> : null}

      {!isLoading && !error ? (
        <SectionCard>
          {notifications.length === 0 ? (
            <EmptyState
              description="You have no notifications yet."
              title="No notifications"
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  style={{
                    borderLeft: notification.readAt ? 'none' : '3px solid var(--color-accent)',
                    background: notification.readAt ? 'transparent' : 'var(--color-info-bg)',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '14px 16px',
                      cursor: notification.link ? 'pointer' : 'default',
                      alignItems: 'flex-start',
                    }}
                    onClick={() => void handleClick(notification)}
                    role={notification.link ? 'button' : undefined}
                    tabIndex={notification.link ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (notification.link && (e.key === 'Enter' || e.key === ' ')) {
                        void handleClick(notification);
                      }
                    }}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>
                      {eventIcon(notification.eventType)}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: notification.readAt ? 400 : 600, fontSize: '14px', lineHeight: 1.4 }}>
                        {notification.title}
                      </div>
                      {notification.body && (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                          {notification.body}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
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
                          fontSize: '18px',
                          flexShrink: 0,
                          padding: '0 4px',
                        }}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
