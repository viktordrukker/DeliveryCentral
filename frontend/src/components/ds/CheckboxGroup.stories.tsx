import type { Story } from '@ladle/react';
import { useState } from 'react';

import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';

export default { title: 'DS / Forms / Choice groups' };

const SKILLS = [
  { value: 'react', label: 'React' },
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go', hint: 'Bonus' },
  { value: 'rust', label: 'Rust', disabled: true, hint: 'Out of scope' },
];

export const CheckboxesVertical: Story = () => {
  const [value, setValue] = useState<string[]>(['react', 'node']);
  return <CheckboxGroup legend="Skills required" options={SKILLS} value={value} onValueChange={setValue} />;
};

export const CheckboxesHorizontal: Story = () => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <CheckboxGroup
      legend="Days available"
      orientation="horizontal"
      options={['Mon','Tue','Wed','Thu','Fri'].map((d) => ({ value: d, label: d }))}
      value={value}
      onValueChange={setValue}
    />
  );
};

export const RadiosVertical: Story = () => {
  const [value, setValue] = useState('weekly');
  return (
    <RadioGroup
      legend="Cadence"
      options={[
        { value: 'weekly', label: 'Weekly' },
        { value: 'fortnightly', label: 'Fortnightly' },
        { value: 'monthly', label: 'Monthly', hint: 'Quarterly review' },
      ]}
      value={value}
      onValueChange={setValue}
    />
  );
};

export const RadiosHorizontal: Story = () => {
  const [value, setValue] = useState('low');
  return (
    <RadioGroup
      legend="Priority"
      orientation="horizontal"
      options={['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
      value={value}
      onValueChange={setValue}
    />
  );
};
