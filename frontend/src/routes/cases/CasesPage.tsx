import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTitleBarActions } from '@/app/title-bar-context';
import { PageContainer } from '@/components/common/PageContainer';
import { TipTrigger } from '@/components/common/TipBalloon';
import { ExportButton } from '@/components/common/ExportButton';
import { CasesPanel } from '@/components/cases/CasesPanel';
import { useCasesList } from '@/features/cases/useCasesList';
import { Button } from '@/components/ds';

export function CasesPage(): JSX.Element {
  const navigate = useNavigate();
  const { setActions } = useTitleBarActions();
  // Title-bar export pulls the same hook data the panel renders; safe because
  // useCasesList is referentially-stable across hook callers in this tree.
  const state = useCasesList();

  useEffect(() => {
    setActions(
      <>
        <ExportButton
          data={state.data}
          columns={[
            { key: 'caseNumber', label: 'Case #' },
            { key: 'caseTypeDisplayName', label: 'Type' },
            { key: 'subjectPersonName', label: 'Subject' },
            { key: 'ownerPersonName', label: 'Owner' },
            { key: 'status', label: 'Status' },
            { key: 'summary', label: 'Summary' },
            { key: 'openedAt', label: 'Opened' },
            { key: 'closedAt', label: 'Closed' },
          ]}
          filename="cases"
        />
        <Button variant="primary" onClick={() => navigate('/cases/new')} type="button">
          Create case
        </Button>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, navigate, state.data]);

  return (
    <PageContainer testId="cases-page" viewport>
      <CasesPanel />
    </PageContainer>
  );
}
