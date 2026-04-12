export function Skeleton({ className = '' }: { className?: string }): JSX.Element {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({
  cols = 4,
  rows = 5,
}: {
  cols?: number;
  rows?: number;
}): JSX.Element {
  return (
    <div className="skeleton-table" data-testid="skeleton-table">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="skeleton skeleton--table-row" key={rowIndex} style={{ display: 'flex', gap: '8px' }}>
          {Array.from({ length: cols }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              className="skeleton--table-cell"
              // eslint-disable-next-line react/forbid-dom-props
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton(): JSX.Element {
  return <div className="skeleton skeleton--card" data-testid="skeleton-card" />;
}

export function ChartSkeleton(): JSX.Element {
  return <div className="skeleton skeleton--chart" data-testid="skeleton-chart" />;
}
