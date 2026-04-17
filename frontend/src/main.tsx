import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';

import { App } from './app/App';
import { useAppTheme } from './app/theme';
import { bootstrapDesignTokens } from './styles/design-tokens';
import './styles/global.css';

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
