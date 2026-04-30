import type { Story } from '@ladle/react';

import { Button } from './Button';
import { ThemeProvider, useThemePreference, type ThemePreference } from './ThemeProvider';

export default { title: 'DS / ThemeProvider' };

const OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

function PreferenceSwitcher() {
  const { mode, preference, setPreference } = useThemePreference();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        Preference: <strong>{preference}</strong> &middot; Active mode: <strong>{mode}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {OPTIONS.map((option) => (
          <Button
            key={option}
            variant={preference === option ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setPreference(option)}
          >
            {option}
          </Button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-subtle)', margin: 0 }}>
        Each click writes to <code>localStorage['dc:dark-mode']</code> (or removes it for {'"'}system{'"'}).
      </p>
    </div>
  );
}

export const PreferenceContext: Story = () => (
  <ThemeProvider>
    <PreferenceSwitcher />
  </ThemeProvider>
);
