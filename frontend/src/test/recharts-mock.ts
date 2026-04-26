import { vi } from 'vitest';

vi.mock('recharts', () => {
  const React = require('react');
  const PassThrough = ({ children }: { children?: React.ReactNode }) => children ?? null;
  const Noop = () => null;
  return {
    Area: Noop,
    AreaChart: PassThrough,
    Bar: Noop,
    BarChart: PassThrough,
    CartesianGrid: Noop,
    Cell: Noop,
    ComposedChart: PassThrough,
    Legend: Noop,
    Line: Noop,
    LineChart: PassThrough,
    Pie: Noop,
    PieChart: PassThrough,
    PolarAngleAxis: Noop,
    PolarGrid: Noop,
    PolarRadiusAxis: Noop,
    Radar: Noop,
    RadarChart: Noop,
    RadialBar: Noop,
    RadialBarChart: Noop,
    ReferenceArea: Noop,
    ReferenceLine: Noop,
    ResponsiveContainer: PassThrough,
    Scatter: Noop,
    ScatterChart: Noop,
    Tooltip: Noop,
    Treemap: Noop,
    XAxis: Noop,
    YAxis: Noop,
  };
});
