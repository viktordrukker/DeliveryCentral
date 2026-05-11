import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { getDashboardPath } from '@/app/role-routing';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  director: 'Director',
  hr_manager: 'HR Manager',
  resource_manager: 'Resource Manager',
  project_manager: 'Project Manager',
  delivery_manager: 'Delivery Manager',
  employee: 'Employee',
};

function formatRoleList(roles: string[]): string {
  if (roles.length === 0) return '—';
  const labeled = roles.map((r) => ROLE_LABELS[r] ?? r);
  if (labeled.length === 1) return labeled[0];
  if (labeled.length === 2) return labeled.join(' or ');
  return `${labeled.slice(0, -1).join(', ')}, or ${labeled[labeled.length - 1]}`;
}

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}): JSX.Element | null {
  const { principal } = useAuth();
  const navigate = useNavigate();

  if (!principal) {
    return null;
  }

  const hasRole = allowedRoles.some((r) => principal.roles.includes(r));
  if (hasRole) {
    return <>{children}</>;
  }

  const dashboardPath = getDashboardPath(principal.roles);
  const currentRole = principal.roles[0] ?? 'unknown';
  const requiredRoles = formatRoleList(allowedRoles);

  return (
    <PageContainer testId="role-guard-forbidden">
      <PageHeader
        eyebrow="Access denied"
        title="You don't have access to this page"
        subtitle={`This page is restricted to ${requiredRoles}. Your current role is ${ROLE_LABELS[currentRole] ?? currentRole}.`}
      />
      <SectionCard>
        <EmptyState
          icon={LockOutlinedIcon}
          title="Restricted page"
          description="Choose where you'd like to go next. If you believe you should have access, ask your admin to update your role."
          actions={[
            { label: 'Go to my dashboard', href: dashboardPath, variant: 'primary' },
            { label: 'Back', onClick: () => navigate(-1), variant: 'secondary' },
          ]}
        />
      </SectionCard>
    </PageContainer>
  );
}
