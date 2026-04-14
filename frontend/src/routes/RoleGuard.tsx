import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}): JSX.Element | null {
  const { principal } = useAuth();
  const navigate = useNavigate();

  const hasRole = allowedRoles.some((r) => principal?.roles.includes(r));

  useEffect(() => {
    if (!hasRole && principal) {
      const home = getDashboardPath(principal.roles);
      toast.info("You've been redirected to your dashboard");
      navigate(home, { replace: true });
    }
  }, [hasRole, principal, navigate]);

  if (!hasRole) {
    return null;
  }

  return <>{children}</>;
}
