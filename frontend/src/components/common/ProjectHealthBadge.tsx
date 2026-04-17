import { StatusBadge, type StatusTone } from './StatusBadge';

interface ProjectHealthBadgeProps {
  grade: 'green' | 'yellow' | 'red';
  score: number;
  size?: 'sm' | 'md';
}

export function ProjectHealthBadge({
  grade,
  score,
  size = 'md',
}: ProjectHealthBadgeProps): JSX.Element {
  const toneByGrade: Record<ProjectHealthBadgeProps['grade'], StatusTone> = {
    green: 'active',
    red: 'danger',
    yellow: 'warning',
  };

  return (
    <StatusBadge
      label={String(score)}
      score={score}
      size={size === 'sm' ? 'small' : 'medium'}
      title={`Health score: ${score}/100 (${grade})`}
      tone={toneByGrade[grade]}
      variant="score"
    />
  );
}
