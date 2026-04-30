import type { Story } from '@ladle/react';
import { useState } from 'react';

import { DatePicker } from './DatePicker';
import { DateRangePicker } from './DateRangePicker';
import { FormField } from './FormField';

export default { title: 'DS / Forms / DatePicker' };

export const Single: Story = () => {
  const [date, setDate] = useState('');
  return (
    <FormField label="Effective date" required>
      {(props) => <DatePicker value={date} onValueChange={setDate} {...props} />}
    </FormField>
  );
};

export const SingleInvalid: Story = () => (
  <FormField label="Date" error="Date must be in the future">
    {(props) => <DatePicker value="2020-01-01" onValueChange={() => undefined} invalid {...props} />}
  </FormField>
);

export const Range: Story = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />;
};

export const RangeInline: Story = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} inline />;
};
