import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';

import { useAuth } from '@/app/auth-context';

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();

  const hasRole = allowedRoles.some((r) => principal?.roles.includes(r));

  if (!hasRole) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Access denied
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          You do not have permission to view this page.
        </Typography>
        <Box mt={2}>
          <Button variant="outlined" size="small" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}
