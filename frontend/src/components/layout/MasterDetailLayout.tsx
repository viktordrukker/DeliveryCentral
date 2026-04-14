import Box from '@mui/material/Box';

interface MasterDetailLayoutProps {
  listContent: React.ReactNode;
  detailContent: React.ReactNode;
  hasSelection: boolean;
  listWidth?: string;
}

export function MasterDetailLayout({
  listContent,
  detailContent,
  hasSelection,
  listWidth = '40%',
}: MasterDetailLayoutProps): JSX.Element {
  return (
    <Box
      className="master-detail-layout"
      sx={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        className="master-detail-layout__list"
        sx={{
          width: hasSelection ? listWidth : '100%',
          overflow: 'auto',
          transition: 'width var(--transition-normal)',
          borderRight: hasSelection ? '1px solid var(--color-border)' : 'none',
        }}
      >
        {listContent}
      </Box>
      {hasSelection && (
        <Box
          className="master-detail-layout__detail"
          sx={{
            flex: 1,
            overflow: 'auto',
          }}
        >
          {detailContent}
        </Box>
      )}
    </Box>
  );
}
