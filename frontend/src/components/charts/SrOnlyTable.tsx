/**
 * Renders an SR-only (visually hidden) HTML table that contains the same
 * data as a chart, satisfying WCAG 1.3.1 "Info and Relationships".
 * Screen readers read this table; sighted users see the visual chart.
 */
interface SrOnlyTableProps {
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}

export function SrOnlyTable({ caption, headers, rows }: SrOnlyTableProps): JSX.Element {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              j === 0
                ? <th key={j} scope="row">{cell}</th>
                : <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
