import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { App } from './app/App';
import { useAppTheme } from './app/theme';
import { bootstrapDesignTokens } from './styles/design-tokens';
import './styles/global.css';
import './components/ds/ds.css';

// Recharts' ResponsiveContainer transiently reports width/height of -1 on first
// paint (ResizeObserver fires before layout). The warning is non-actionable and
// resolves itself on the next tick. Filter it to keep console noise-free.
const RECHARTS_SIZE_WARNING = 'The width(-1) and height(-1) of chart should be greater than 0';
const originalWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  const first = args[0];
  if (typeof first === 'string' && first.includes(RECHARTS_SIZE_WARNING)) return;
  originalWarn(...args);
};

function Root(): JSX.Element {
  const theme = useAppTheme();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

bootstrapDesignTokens();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
