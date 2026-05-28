import { useImpersonation } from '@/app/impersonation-context';

export function ImpersonationBanner(): JSX.Element | null {
  const { impersonation, exitImpersonation } = useImpersonation();

  if (!impersonation) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        alignItems: 'center',
        background: 'var(--color-impersonation-bg)',
        color: 'var(--color-impersonation-fg)',
        display: 'flex',
        fontSize: '13px',
        fontWeight: 600,
        gap: '12px',
        justifyContent: 'center',
        padding: '6px 16px',
        position: 'sticky',
        top: 0,
        zIndex: 300,
      }}
    >
      <span>Viewing as {impersonation.displayName}</span>
      <button
        onClick={exitImpersonation}
        style={{
          background: 'color-mix(in srgb, var(--color-impersonation-fg) 20%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-impersonation-fg) 40%, transparent)',
          borderRadius: '4px',
          color: 'var(--color-impersonation-fg)',
          cursor: 'pointer',
          fontSize: '12px',
          padding: '2px 10px',
        }}
        type="button"
      >
        Exit impersonation
      </button>
    </div>
  );
}
