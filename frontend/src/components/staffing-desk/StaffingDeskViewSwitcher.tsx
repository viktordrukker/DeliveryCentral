interface Props {
  value: string;
  onChange: (view: string) => void;
}

const VIEWS = [
  { key: 'table', label: 'Table' },
  { key: 'planner', label: 'Planner' },
] as const;

export function StaffingDeskViewSwitcher({ value, onChange }: Props): JSX.Element {
  return (
    <div role="tablist" style={{ display: 'inline-flex', gap: 0, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
      {VIEWS.map((v) => (
        <button
          key={v.key}
          role="tab"
          aria-selected={value === v.key}
          className={value === v.key ? 'button button--sm' : 'button button--secondary button--sm'}
          onClick={() => onChange(v.key)}
          style={{ borderRadius: 0, border: 'none', minWidth: 70 }}
          type="button"
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
