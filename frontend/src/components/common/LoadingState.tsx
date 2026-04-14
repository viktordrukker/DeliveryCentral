import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

export type SkeletonType = 'table' | 'cards' | 'page' | 'detail' | 'chart';

interface LoadingStateProps {
  label?: string;
  variant?: 'spinner' | 'skeleton';
  skeletonType?: SkeletonType;
}

function TableSkeleton(): JSX.Element {
  return (
    <div className="skeleton-table" data-testid="skeleton-table">
      <Skeleton variant="rectangular" height={36} sx={{ mb: 1, borderRadius: 1 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={28} sx={{ mb: 0.5, borderRadius: 0.5, opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

function CardsSkeleton(): JSX.Element {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" height={88} sx={{ borderRadius: 2, flex: 1, minWidth: 160 }} />
      ))}
    </div>
  );
}

function ChartSkeleton(): JSX.Element {
  return (
    <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
  );
}

function DetailSkeleton(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Skeleton variant="rectangular" height={40} width="60%" sx={{ borderRadius: 1 }} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={32} width={80} sx={{ borderRadius: 1 }} />
        ))}
      </Box>
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
    </Box>
  );
}

function PageSkeleton(): JSX.Element {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Skeleton variant="rectangular" height={36} width="40%" sx={{ borderRadius: 1 }} />
      <CardsSkeleton />
      <TableSkeleton />
    </Box>
  );
}

const SKELETON_MAP: Record<SkeletonType, () => JSX.Element> = {
  table: TableSkeleton,
  cards: CardsSkeleton,
  page: PageSkeleton,
  detail: DetailSkeleton,
  chart: ChartSkeleton,
};

export function LoadingState({
  label = 'Loading data…',
  variant = 'spinner',
  skeletonType = 'page',
}: LoadingStateProps): JSX.Element {
  if (variant === 'skeleton') {
    const Comp = SKELETON_MAP[skeletonType];
    return (
      <div className="skeleton-container" aria-live="polite" aria-label={label}>
        <Comp />
      </div>
    );
  }

  return (
    <div className="feedback-state feedback-state--loading" aria-live="polite">
      <h3>{label}</h3>
    </div>
  );
}
