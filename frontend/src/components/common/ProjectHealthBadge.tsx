const GRADE_COLORS: Record<'green' | 'yellow' | 'red', string> = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
};

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
  const color = GRADE_COLORS[grade];
  const circleSize = size === 'sm' ? 20 : 28;
  const fontSize = size === 'sm' ? 9 : 11;

  return (
    <span
      aria-label={`Health: ${score} (${grade})`}
      style={{
        alignItems: 'center',
        display: 'inline-flex',
        gap: 4,
      }}
      title={`Health score: ${score}/100 (${grade})`}
    >
      <svg
        height={circleSize}
        style={{ flexShrink: 0 }}
        viewBox={`0 0 ${circleSize} ${circleSize}`}
        width={circleSize}
      >
        <circle
          cx={circleSize / 2}
          cy={circleSize / 2}
          fill={color}
          r={circleSize / 2 - 1}
        />
        <text
          dominantBaseline="central"
          fill="#fff"
          fontSize={fontSize}
          fontWeight="bold"
          textAnchor="middle"
          x={circleSize / 2}
          y={circleSize / 2}
        >
          {score}
        </text>
      </svg>
    </span>
  );
}
