interface StatusCardProps {
  label: string;
  value: string;
}

export function StatusCard({ label, value }: StatusCardProps): JSX.Element {
  return (
    <div className="status-card">
      <div className="status-card__value">{value}</div>
      <div className="status-card__label">{label}</div>
    </div>
  );
}
