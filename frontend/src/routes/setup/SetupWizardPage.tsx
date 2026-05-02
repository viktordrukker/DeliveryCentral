import { Box, Card, CardContent, LinearProgress, Stack, Step, StepLabel, Stepper, Typography } from '@mui/material';

import { DiagnosticBundleButton } from './components/DiagnosticBundleButton';
import { AdminAccountScreen } from './screens/AdminAccountScreen';
import { CompleteScreen } from './screens/CompleteScreen';
import { IntegrationsScreen } from './screens/IntegrationsScreen';
import { MigrationsScreen } from './screens/MigrationsScreen';
import { MonitoringScreen } from './screens/MonitoringScreen';
import { PreflightScreen } from './screens/PreflightScreen';
import { SeedProfileScreen } from './screens/SeedProfileScreen';
import { TenantScreen } from './screens/TenantScreen';
import { TokenPromptScreen } from './screens/TokenPromptScreen';
import { useSetupWizard, type WizardScreen } from './useSetupWizard';

const STEP_ORDER: WizardScreen[] = [
  'preflight',
  'migrations',
  'tenant',
  'admin',
  'integrations',
  'monitoring',
  'seed-profile',
  'complete',
];
const STEP_LABELS: Record<WizardScreen, string> = {
  'token-prompt': 'Token',
  preflight: 'Pre-flight',
  migrations: 'Migrations',
  tenant: 'Tenant',
  admin: 'Admin',
  integrations: 'Integrations',
  monitoring: 'Monitoring',
  'seed-profile': 'Install path',
  complete: 'Finish',
};

export function SetupWizardPage(): JSX.Element {
  const wiz = useSetupWizard();
  const { state } = wiz;

  const activeIndex = state.screen === 'token-prompt' ? -1 : STEP_ORDER.indexOf(state.screen);

  return (
    <Box
      sx={{
        // Global CSS locks html/body/#root to height: 100dvh + overflow: hidden
        // so the AppShell can manage its own scroll regions. The wizard is
        // pre-auth and renders outside the shell, so it has to be its own
        // scroll container — otherwise long forms (Integrations, Monitoring)
        // get clipped at the viewport with no way to reach Continue.
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        py: { xs: 2, sm: 4 },
        px: { xs: 1, sm: 2 },
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 720, my: 'auto' }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={1}
              mb={1}
            >
              <Typography variant="overline" color="text.secondary">
                DeliveryCentral install wizard
              </Typography>
              <DiagnosticBundleButton token={state.token} runId={state.runId} />
            </Stack>
            {state.screen !== 'token-prompt' && (
              <Stepper
                activeStep={Math.max(0, activeIndex)}
                alternativeLabel
                sx={{
                  mt: 1,
                  // Stepper labels under alternativeLabel collide on narrow
                  // viewports — shrink the label font and let it wrap so the
                  // 8-step row stays readable down to ~360px.
                  '& .MuiStepLabel-label': {
                    fontSize: { xs: '0.7rem', sm: '0.75rem' },
                    lineHeight: 1.2,
                  },
                  '& .MuiStepConnector-root': {
                    top: { xs: 10, sm: 12 },
                  },
                }}
              >
                {STEP_ORDER.map((s) => (
                  <Step key={s}>
                    <StepLabel>{STEP_LABELS[s]}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
            {state.loading && <LinearProgress sx={{ mt: 2 }} />}
          </Box>

          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>{renderScreen(wiz)}</Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function renderScreen(wiz: ReturnType<typeof useSetupWizard>): JSX.Element {
  const { state, setToken, preflight, createDb, applyPendingMigrations, saveTenant, saveAdmin, saveIntegrationsConfig, testSmtp, saveMonitoringConfig, pickSeedProfile, finish, goToScreen } = wiz;

  switch (state.screen) {
    case 'token-prompt':
      return <TokenPromptScreen onSubmit={setToken} loading={state.loading} error={state.error} />;
    case 'preflight':
      return (
        <PreflightScreen
          result={state.preflight}
          loading={state.loading}
          error={state.error}
          onRunPreflight={preflight}
          onCreateDatabase={createDb}
          onContinue={() =>
            goToScreen(
              state.preflight && state.preflight.migrations.pending.length === 0 && state.preflight.branch !== 'MIGRATIONS_BEHIND'
                ? 'tenant'
                : 'migrations',
            )
          }
        />
      );
    case 'migrations':
      return (
        <MigrationsScreen
          result={state.preflight}
          loading={state.loading}
          error={state.error}
          onApply={applyPendingMigrations}
        />
      );
    case 'tenant':
      return <TenantScreen loading={state.loading} error={state.error} onSave={saveTenant} />;
    case 'admin':
      return <AdminAccountScreen loading={state.loading} error={state.error} onSave={saveAdmin} />;
    case 'integrations':
      return (
        <IntegrationsScreen
          loading={state.loading}
          error={state.error}
          onSave={saveIntegrationsConfig}
          onTestSmtp={testSmtp}
          onSkip={() => goToScreen('monitoring')}
        />
      );
    case 'monitoring':
      return (
        <MonitoringScreen
          loading={state.loading}
          error={state.error}
          onSave={saveMonitoringConfig}
          onSkip={() => goToScreen('seed-profile')}
        />
      );
    case 'seed-profile':
      return <SeedProfileScreen loading={state.loading} error={state.error} onPick={pickSeedProfile} />;
    case 'complete':
      return <CompleteScreen loading={state.loading} error={state.error} onFinish={finish} />;
    default:
      return <></>;
  }
}
