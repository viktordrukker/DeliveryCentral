interface DataQualityRadarProps {
  scores: {
    assignmentPct: number;
    emailPct: number;
    managerPct: number;
    orgUnitPct: number;
    resourcePoolPct: number;
  };
}

export function DataQualityRadar({ scores }: DataQualityRadarProps): JSX.Element {
  const rows = [
    { label: 'Manager', value: scores.managerPct },
    { label: 'Org Unit', value: scores.orgUnitPct },
    { label: 'Assignments', value: scores.assignmentPct },
    { label: 'Email', value: scores.emailPct },
    { label: 'Resource Pool', value: scores.resourcePoolPct },
  ];

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Signal</th>
          <th>Coverage</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td>{row.label}</td>
            <td>{row.value}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
