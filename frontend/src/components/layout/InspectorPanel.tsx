import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { InlineConfirm } from '@/components/common/InlineConfirm';

interface InspectorAction<T> {
  label: string;
  variant: 'primary' | 'secondary' | 'destructive';
  icon?: React.ElementType;
  onClick: (item: T) => void;
  requiresConfirm?: boolean;
  confirmMessage?: string;
}

interface InspectorSection<T> {
  label: string;
  render: (item: T) => React.ReactNode;
  loading?: boolean;
}

export interface InspectorPanelProps<T> {
  selectedItem: T | null;
  onClose: () => void;
  title: (item: T) => string;
  subtitle?: (item: T) => string;
  sections: InspectorSection<T>[];
  actions: InspectorAction<T>[];
  emptyState?: React.ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  width?: string;
}

export function InspectorPanel<T>({
  selectedItem,
  onClose,
  title,
  subtitle,
  sections,
  actions,
  emptyState,
  onNext,
  onPrevious,
  width = '60%',
}: InspectorPanelProps<T>): JSX.Element {
  if (!selectedItem) {
    return (
      <Box className="inspector-panel inspector-panel--empty" sx={{ width, p: 4, textAlign: 'center' }}>
        {emptyState ?? (
          <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
            Select an item to view details
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box
      className="inspector-panel"
      sx={{
        width,
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        background: 'var(--color-surface)',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ color: 'var(--color-text)' }}>
            {title(selectedItem)}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'var(--color-text-muted)' }}>
              {subtitle(selectedItem)}
            </Typography>
          )}
        </Box>
        {onPrevious && (
          <IconButton size="small" onClick={onPrevious} title="Previous">
            <ChevronLeftIcon />
          </IconButton>
        )}
        {onNext && (
          <IconButton size="small" onClick={onNext} title="Next">
            <ChevronRightIcon />
          </IconButton>
        )}
        <IconButton size="small" onClick={onClose} title="Close">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Sections */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sections.map((section) => (
          <Box key={section.label}>
            <Typography variant="overline" sx={{ color: 'var(--color-text-muted)', mb: 1, display: 'block' }}>
              {section.label}
            </Typography>
            {section.loading ? (
              <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
            ) : (
              section.render(selectedItem)
            )}
          </Box>
        ))}
      </Box>

      {/* Actions */}
      {actions.length > 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {actions.map((action) => {
              const btn = (
                <Button
                  key={action.label}
                  size="small"
                  variant={action.variant === 'primary' ? 'contained' : 'outlined'}
                  color={action.variant === 'destructive' ? 'error' : 'primary'}
                  startIcon={action.icon ? <action.icon /> : undefined}
                  onClick={() => action.onClick(selectedItem)}
                >
                  {action.label}
                </Button>
              );

              if (action.requiresConfirm) {
                return (
                  <InlineConfirm
                    key={action.label}
                    trigger={btn}
                    onConfirm={() => action.onClick(selectedItem)}
                    message={action.confirmMessage}
                    variant={action.variant === 'destructive' ? 'destructive' : 'default'}
                  />
                );
              }

              return btn;
            })}
          </Box>
        </>
      )}
    </Box>
  );
}
