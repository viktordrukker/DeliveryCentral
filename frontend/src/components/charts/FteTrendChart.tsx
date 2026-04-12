import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface FteTrendPoint {
  month: string;
  fte: number;
}

interface FteTrendChartProps {
  data: FteTrendPoint[];
}

export function FteTrendChart({ data }: FteTrendChartProps): JSX.Element {
  return (
    <div style={{ flex: 1, minHeight: 220 }}>

    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={data} margin={{ bottom: 4, left: 0, right: 16, top: 8 }} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          dataKey="fte"
          dot={{ r: 3 }}
          name="FTE (staffed people)"
          stroke="#6366f1"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
