import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { fetchSetupStatus, type SetupStatus } from '@/lib/api/setup';

/**
 * Runs `/api/setup/status` on mount. If the platform isn't set up yet,
 * funnels every request to `/setup`. The /setup route itself is exempt
 * from the gate (otherwise we'd redirect-loop).
 *
 * Wraps every top-level route in router.tsx — sits BEFORE AuthProvider
 * so a fresh install doesn't try to log in / refresh tokens against a
 * platform that hasn't been provisioned.
 */
export function SetupGate({ children }: { children: React.ReactNode }): JSX.Element {
  const location = useLocation();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSetupRoute = location.pathname.startsWith('/setup');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const s = await fetchSetupStatus();
        if (active) setStatus(s);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
          // Fail-open: don't block the app on a transient status fetch error.
          setStatus({
            required: false,
            tokenRequired: false,
            runId: null,
            nextStep: null,
            completedAt: null,
            fingerprint: null,
          });
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (status === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#666' }}>
        Loading…
      </div>
    );
  }

  if (status.required && !isSetupRoute) {
    return <Navigate to="/setup" replace />;
  }

  if (!status.required && isSetupRoute) {
    return <Navigate to="/login" replace />;
  }

  // Surface unrecoverable status errors via a console hint — non-blocking.
  if (error) {
    console.warn('Setup status fetch failed (continuing):', error);
  }

  return <>{children}</>;
}
