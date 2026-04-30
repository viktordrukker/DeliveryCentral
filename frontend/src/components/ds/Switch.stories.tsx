import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Switch } from './Switch';

export default { title: 'DS / Switch' };

export const Default: Story = () => {
  const [on, setOn] = useState(false);
  return <Switch label={`Notifications ${on ? 'enabled' : 'disabled'}`} checked={on} onChange={(e) => setOn(e.target.checked)} />;
};

export const Disabled: Story = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <Switch disabled label="Disabled, off" />
    <Switch disabled defaultChecked label="Disabled, on" />
  </div>
);
