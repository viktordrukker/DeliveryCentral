import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useEvidenceManagement } from '@/app/platform-settings-context';
import { getDashboardPath } from '@/app/role-routing';
import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { type FeatureFlagId, isFeatureEnabled } from '@/lib/feature-flags';

type FeatureGuardProps =
  | {
      children: React.ReactNode;
      feature: 'evidenceManagement';
      flag?: never;
    }
  | {
      children: React.ReactNode;
      feature?: never;
      flag: FeatureFlagId;
    };

const FEATURE_LABELS: Record<string, string> = {
  evidenceManagement: 'Evidence Management',
};

function FeatureNotEnabled({ featureName }: { featureName: string }): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = principal ? getDashboardPath(principal.roles) : '/';
  const label = FEATURE_LABELS[featureName] ?? featureName;

  return (
    <PageContainer testId="feature-guard-disabled">
      <PageHeader
        eyebrow="Feature not enabled"
        title={`${label} is turned off`}
        subtitle={`Your admin has not enabled ${label} for this tenant. Once it's on, you'll see this page populated.`}
      />
      <SectionCard>
        <EmptyState
          icon={PowerSettingsNewOutlinedIcon}
          title="Module disabled"
          description="Ask your admin to enable this module if you need it. Otherwise, head back to your dashboard."
          actions={[
            { label: 'Go to my dashboard', href: dashboardPath, variant: 'primary' },
            { label: 'Back', onClick: () => navigate(-1), variant: 'secondary' },
          ]}
        />
      </SectionCard>
    </PageContainer>
  );
}

export function FeatureGuard({ children, feature, flag }: FeatureGuardProps): JSX.Element {
  if (feature === 'evidenceManagement') {
    return <EvidenceManagementGuard>{children}</EvidenceManagementGuard>;
  }

  if (flag) {
    if (!isFeatureEnabled(flag)) {
      return <FeatureNotEnabled featureName={flag} />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}

function EvidenceManagementGuard({ children }: { children: React.ReactNode }): JSX.Element {
  const evidenceManagement = useEvidenceManagement();
  if (!evidenceManagement.enabled) {
    return <FeatureNotEnabled featureName="evidenceManagement" />;
  }
  return <>{children}</>;
}
