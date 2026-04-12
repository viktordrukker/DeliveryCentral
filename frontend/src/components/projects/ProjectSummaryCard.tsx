import { SectionCard } from '@/components/common/SectionCard';

interface ProjectSummaryCardProps {
  label: string;
  value: string;
}

export function ProjectSummaryCard({
  label,
  value,
}: ProjectSummaryCardProps): JSX.Element {
  return (
    <SectionCard>
      <div className="metric-card">
        <div className="metric-card__value metric-card__value--compact">{value}</div>
        <div className="metric-card__label">{label}</div>
      </div>
    </SectionCard>
  );
}
