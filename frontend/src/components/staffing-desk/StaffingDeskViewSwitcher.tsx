import { Button } from '@/components/ds';

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
        <Button
          key={v.key}
          role="tab"
          aria-selected={value === v.key}
          size="sm"
          variant={value === v.key ? 'primary' : 'secondary'}
          onClick={() => onChange(v.key)}
          style={{ borderRadius: 0, border: 'none', minWidth: 70 }}
        >
          {v.label}
        </Button>
      ))}
    </div>
  );
}
