import type { Story } from '@ladle/react';
import { useState } from 'react';

import { Calendar, type CalendarEvent } from './Calendar';

export default { title: 'DS / Forms / Calendar' };

const TODAY = new Date(2026, 4, 23);
const MONTH = new Date(2026, 4, 1);

export const Picker: Story = () => {
  const [value, setValue] = useState<Date | null>(null);
  return <Calendar today={TODAY} month={MONTH} value={value} onChange={setValue} />;
};

export const PickerWithEvents: Story = () => {
  const [value, setValue] = useState<Date | null>(null);
  const events: CalendarEvent[] = [
    { date: new Date(2026, 4, 5), kind: 'approved', label: 'AL' },
    { date: new Date(2026, 4, 12), kind: 'pending', label: 'AL pending' },
    { date: new Date(2026, 4, 25), kind: 'holiday', label: 'Spring bank' },
    { date: new Date(2026, 4, 26), kind: 'holiday' },
  ];
  return (
    <Calendar
      today={TODAY}
      month={MONTH}
      value={value}
      onChange={setValue}
      events={events}
    />
  );
};

export const Range: Story = () => {
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  return (
    <Calendar
      today={TODAY}
      month={MONTH}
      range
      rangeStart={start}
      rangeEnd={end}
      onRangeChange={(s, e) => {
        setStart(s);
        setEnd(e);
      }}
    />
  );
};

export const YearOverview: Story = () => {
  const events: CalendarEvent[] = [
    { date: new Date(2026, 1, 14), kind: 'approved' },
    { date: new Date(2026, 3, 6), kind: 'holiday' },
    { date: new Date(2026, 5, 10), kind: 'pending' },
    { date: new Date(2026, 7, 22), kind: 'leave' },
    { date: new Date(2026, 11, 25), kind: 'holiday' },
  ];
  return <Calendar today={TODAY} month={MONTH} mode="year" events={events} />;
};

export const SizeXs: Story = () => (
  <Calendar today={TODAY} month={MONTH} size="xs" />
);

export const SizeSm: Story = () => (
  <Calendar today={TODAY} month={MONTH} size="sm" />
);

export const WeekStartsSunday: Story = () => (
  <Calendar today={TODAY} month={MONTH} weekStartsOn={0} />
);
