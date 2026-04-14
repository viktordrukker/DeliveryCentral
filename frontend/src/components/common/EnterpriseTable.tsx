import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridRowSelectionModel,
  GridSortModel,
} from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

interface BulkAction {
  label: string;
  onClick: (selectedIds: string[]) => void;
  color?: 'primary' | 'error' | 'warning';
}

interface EnterpriseTableProps {
  rows: Array<Record<string, unknown>>;
  columns: GridColDef[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyIcon?: React.ElementType;
  emptyAction?: { label: string; onClick: () => void };
  onRowClick?: (row: Record<string, unknown>) => void;
  bulkActions?: BulkAction[];
  defaultPageSize?: number;
  stickyHeader?: boolean;
  defaultSort?: { field: string; sort: 'asc' | 'desc' };
  getRowId?: (row: Record<string, unknown>) => string;
  autoHeight?: boolean;
}

export function EnterpriseTable({
  rows,
  columns,
  loading = false,
  error,
  onRetry,
  emptyMessage = 'No data found',
  emptyIcon,
  emptyAction,
  onRowClick,
  bulkActions,
  defaultPageSize = 25,
  defaultSort,
  getRowId,
  autoHeight = false,
}: EnterpriseTableProps): JSX.Element {
  const navigate = useNavigate();

  const initialSortModel: GridSortModel = useMemo(
    () => (defaultSort ? [{ field: defaultSort.field, sort: defaultSort.sort }] : []),
    [defaultSort],
  );

  const handleRowClick = useCallback(
    (params: { row: Record<string, unknown> }) => {
      onRowClick?.(params.row);
    },
    [onRowClick],
  );

  if (error) {
    return <ErrorState description={error} onRetry={onRetry} variant="card" />;
  }

  if (loading) {
    return <LoadingState variant="skeleton" skeletonType="table" />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        icon={emptyIcon}
        actions={emptyAction ? [{ label: emptyAction.label, onClick: emptyAction.onClick }] : undefined}
      />
    );
  }

  return (
    <Box className="enterprise-table" sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight={autoHeight}
        getRowId={getRowId as ((row: Record<string, unknown>) => string | number) | undefined}
        initialState={{
          pagination: { paginationModel: { pageSize: defaultPageSize } },
          sorting: { sortModel: initialSortModel },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        checkboxSelection={!!bulkActions?.length}
        disableRowSelectionOnClick={!onRowClick}
        onRowClick={onRowClick ? handleRowClick : undefined}
        sx={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: 'var(--color-surface-alt)',
            borderBottom: '1px solid var(--color-border)',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'var(--color-accent-soft)',
          },
          '& .MuiDataGrid-row': {
            cursor: onRowClick ? 'pointer' : 'default',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: '1px solid var(--color-border)',
          },
          '& .MuiTablePagination-root': {
            color: 'var(--color-text-muted)',
          },
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
    </Box>
  );
}
