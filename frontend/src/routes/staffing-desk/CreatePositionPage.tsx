import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * SoT PR 8 — Embedded CreatePositionDrawer (V2-done criterion 6).
 *
 * The legacy full-page form (CreateStaffingRequestPage → CreatePositionPage)
 * is replaced by an inline drawer mounted on the Project Detail page and
 * Staffing Desk. This route survives as a thin redirect so existing deep
 * links + the Command Palette navigation continue to land users on the
 * drawer:
 *
 *   /staffing-requests/new?projectId=<id>&candidatePersonId=<id>
 *     ↳ /projects/<id>?openCreatePosition=true&candidatePersonId=<id>
 *
 *   /staffing-requests/new (no projectId)
 *     ↳ /staffing-desk?openCreatePosition=true&candidatePersonId=<id>
 */
export function CreatePositionPage(): JSX.Element {
  const [params] = useSearchParams();
  const projectId = params.get('projectId');
  const candidatePersonId = params.get('candidatePersonId');

  const target = new URLSearchParams();
  target.set('openCreatePosition', 'true');
  if (candidatePersonId) target.set('candidatePersonId', candidatePersonId);

  const path = projectId
    ? `/projects/${encodeURIComponent(projectId)}?${target.toString()}`
    : `/staffing-desk?${target.toString()}`;

  return <Navigate to={path} replace />;
}
