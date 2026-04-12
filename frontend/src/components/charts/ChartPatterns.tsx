/**
 * Shared SVG pattern definitions for WCAG 1.4.1 compliance.
 * Use as secondary encoding alongside color in charts so colorblind users
 * can distinguish data series by both color and texture.
 *
 * Usage: render <ChartPatternDefs /> inside a Recharts chart as a child,
 * then reference pattern fills as fill="url(#pattern-stripe)" etc.
 */
export function ChartPatternDefs(): JSX.Element {
  return (
    <defs>
      {/* Diagonal stripe pattern — use for "required" / baseline series */}
      <pattern height="6" id="pattern-stripe" patternUnits="userSpaceOnUse" width="6">
        <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#64748b" strokeWidth="1.5" />
      </pattern>
      {/* Diagonal stripe on indigo — use for "allocated" / actual series */}
      <pattern height="6" id="pattern-stripe-indigo" patternUnits="userSpaceOnUse" width="6">
        <rect fill="#6366f1" height="6" width="6" />
        <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#818cf8" strokeWidth="1.5" />
      </pattern>
      {/* Dot pattern — use for "evidence" / secondary data */}
      <pattern height="6" id="pattern-dots" patternUnits="userSpaceOnUse" width="6">
        <circle cx="3" cy="3" fill="#06b6d4" r="1.5" />
      </pattern>
      {/* Cross-hatch — use for warning/overallocated */}
      <pattern height="6" id="pattern-crosshatch" patternUnits="userSpaceOnUse" width="6">
        <rect fill="#f59e0b" height="6" width="6" />
        <path d="M0,0 l6,6 M6,0 l-6,6" stroke="#fbbf24" strokeWidth="1" />
      </pattern>
    </defs>
  );
}
