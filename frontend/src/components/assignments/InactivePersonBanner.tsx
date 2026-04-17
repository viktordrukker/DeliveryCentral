interface InactivePersonBannerProps {
  onResolutionChange: (resolution: 'hr-case' | 'retroactive') => void;
  personName: string;
  personStatus: string;
  resolution: 'hr-case' | 'retroactive';
}

export function InactivePersonBanner({
  onResolutionChange,
  personName,
  personStatus,
  resolution,
}: InactivePersonBannerProps): JSX.Element {
  return (
    <div
      data-testid="inactive-person-banner"
      style={{
        background: 'var(--color-status-warning)',
        borderRadius: 8,
        color: 'var(--color-surface)',
        marginBottom: 'var(--space-3)',
        padding: '12px 16px',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>
        {personName} is currently {personStatus.toLowerCase()}
      </div>
      <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 8 }}>
        This person is no longer active. Choose a resolution before proceeding:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            checked={resolution === 'hr-case'}
            name="inactive-resolution"
            onChange={() => onResolutionChange('hr-case')}
            type="radio"
          />
          <span>
            <strong>Create HR case</strong> — route to HR/RM to review evidence eligibility
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            checked={resolution === 'retroactive'}
            name="inactive-resolution"
            onChange={() => onResolutionChange('retroactive')}
            type="radio"
          />
          <span>
            <strong>Retroactive assignment</strong> — create a backdated assignment (requires override)
          </span>
        </label>
      </div>
    </div>
  );
}
