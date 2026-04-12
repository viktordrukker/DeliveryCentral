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
        background: '#ea580c',
        color: '#fff',
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
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '4px',
          color: '#fff',
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
