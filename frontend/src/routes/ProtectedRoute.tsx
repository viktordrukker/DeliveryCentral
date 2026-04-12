import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { useAuth } from '@/app/auth-context';

export function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const { isAuthenticated, isLoading, principal } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (principal?.requires2FASetup) {
    return <Navigate to="/auth/2fa-setup" replace />;
  }

  return <>{children}</>;
}
