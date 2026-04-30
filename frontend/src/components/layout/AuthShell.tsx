import { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

interface AuthShellProps {
  /** Optional page title (rendered as `<Typography variant="h5">`). */
  title?: string;
  /** Optional one-line subtitle below the title. */
  subtitle?: string;
  /** Form contents (typically a `<form>` with TextField + Button). */
  children: ReactNode;
  /** Optional `data-testid` for E2E selectors. */
  testId?: string;
}

/**
 * Phase DS-5-1 — compound layout for the Auth Form grammar (Grammar 8 per
 * `docs/planning/phase18-page-grammars.md`).
 *
 * Composes a centered MUI `<Card>` over a full-viewport `<Box>`. The shell
 * stays MUI-based by design (per the [MUI audit](../../../docs/planning/ds-mui-audit.md)) —
 * auth pages are intentionally separate from the main app shell, the bundle
 * weight is paid once for the 4 auth pages, and MUI's TextField + Button
 * ergonomics are well-suited to login/reset forms.
 *
 * Eliminates the repetitive `<Box>` + `<Card>` + `<CardContent>` + title +
 * subtitle boilerplate that was duplicated across `LoginPage`,
 * `ForgotPasswordPage`, `ResetPasswordPage`, `TwoFactorSetupPage`.
 *
 * Usage:
 * ```tsx
 * <AuthShell title="Reset password" subtitle="Enter your email…">
 *   <Box component="form" onSubmit={handleSubmit}>
 *     <TextField … />
 *     <Button type="submit" variant="contained" fullWidth>Send</Button>
 *   </Box>
 * </AuthShell>
 * ```
 */
export function AuthShell({ title, subtitle, children, testId }: AuthShellProps): JSX.Element {
  return (
    <Box
      data-testid={testId}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          {title ? (
            <Typography variant="h5" fontWeight={700} mb={subtitle ? 0.5 : 3}>
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" mb={3}>
              {subtitle}
            </Typography>
          ) : null}
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
