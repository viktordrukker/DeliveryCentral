import { Navigate } from 'react-router-dom';

import { useEvidenceManagement } from '@/app/platform-settings-context';

interface FeatureGuardProps {
  children: React.ReactNode;
  feature: 'evidenceManagement';
  redirectTo?: string;
}

export function FeatureGuard({
  children,
  feature,
  redirectTo = '/',
}: FeatureGuardProps): JSX.Element {
  const evidenceManagement = useEvidenceManagement();

  if (feature === 'evidenceManagement' && !evidenceManagement.enabled) {
    return <Navigate replace to={redirectTo} />;
  }

  return <>{children}</>;
}
