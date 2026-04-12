import { useNavigate } from 'react-router-dom';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

interface OrgDistributionTreemapProps {
  data: Array<{ name: string; orgUnitId?: string; size: number }>;
}

export function OrgDistributionTreemap({ data }: OrgDistributionTreemapProps): JSX.Element {
  const navigate = useNavigate();

  function handleClick(entry: unknown): void {
    const e = entry as { orgUnitId?: string; name?: string } | null;
    if (e?.orgUnitId) {
      void navigate(`/org?orgUnitId=${e.orgUnitId}`);
    }
  }

  return (
    <div style={{ flex: 1, minHeight: 300 }}>

    <ResponsiveContainer height="100%" width="100%">
      <Treemap
        aspectRatio={4 / 3}
        data={data}
        dataKey="size"
        nameKey="name"
        onClick={handleClick}
        stroke="#fff"
        style={{ cursor: 'pointer' }}
      >
        <Tooltip formatter={(v) => [`${String(v)} employees`, 'Headcount']} />
      </Treemap>
    </ResponsiveContainer>
    </div>
  );
}
