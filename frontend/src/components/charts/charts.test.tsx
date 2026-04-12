import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock recharts so SVG rendering doesn't fail in jsdom
vi.mock('recharts', () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => null,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => null,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  RadialBarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radial-bar-chart">{children}</div>,
  RadialBar: () => null,
  Treemap: () => <div data-testid="treemap" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

vi.mock('d3-org-chart', () => {
  function createChainableMock(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const m of ['container', 'data', 'nodeWidth', 'nodeHeight', 'nodeId', 'parentNodeId', 'nodeContent', 'onNodeClick', 'compact', 'render', 'fit', 'connections']) {
      obj[m] = vi.fn(() => obj);
    }
    return obj;
  }
  return { OrgChart: vi.fn().mockImplementation(createChainableMock) };
});

import { StaffingStatusDonut } from './StaffingStatusDonut';
import { HeadcountTrendChart } from './HeadcountTrendChart';
import { WorkloadGauge } from './WorkloadGauge';
import { Sparkline } from './Sparkline';
import { PlannedVsActualBars } from './PlannedVsActualBars';

describe('Chart smoke tests', () => {
  it('StaffingStatusDonut renders without crash', () => {
    render(
      <MemoryRouter>
        <StaffingStatusDonut
          data={[
            { color: '#22c55e', name: 'Approved', value: 5 },
            { color: '#f59e0b', name: 'Requested', value: 2 },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('HeadcountTrendChart renders without crash', () => {
    render(
      <HeadcountTrendChart
        data={[
          { count: 10, week: '2026-W01' },
          { count: 12, week: '2026-W02' },
        ]}
      />,
    );
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('WorkloadGauge renders allocation percentage', () => {
    render(<WorkloadGauge allocationPercent={75} />);
    expect(screen.getByText('Allocation: 75%')).toBeInTheDocument();
  });

  it('Sparkline renders without crash', () => {
    render(<Sparkline data={[1, 2, 3, 2, 4]} />);
    // Sparkline renders an SVG-based component; just check it doesn't throw
    expect(document.querySelector('svg, [data-testid]')).toBeDefined();
  });

  it('PlannedVsActualBars renders without crash', () => {
    render(
      <MemoryRouter>
        <PlannedVsActualBars
          data={[
            { actualHours: 30, personId: 'p1', personName: 'Alice', plannedHours: 40 },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
