import type { Story } from '@ladle/react';

import { Textarea } from './Textarea';

export default { title: 'DS / Textarea' };

export const Default: Story = () => <Textarea placeholder="Tell us more…" />;
export const Invalid: Story = () => <Textarea invalid value="too short" rows={3} />;
export const Disabled: Story = () => <Textarea disabled value="readonly" />;
