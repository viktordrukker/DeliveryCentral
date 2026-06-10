// BalanceMeter.jsx — DS primitive: leave/budget balance breakdown.
// Visual: a horizontal segmented meter with legend, optionally per-type breakdown.
// Reuses existing color tokens (status-*, accent). No new tokens.
//
// Props:
//   entitlement   number   total budget (e.g. 25 days)
//   used          number   already taken
//   pending       number   awaiting approval
//   accrual       number?  earned-but-not-yet-available (optional, shown muted)
//   breakdown     [{label, used, pending, color}]?  per-type breakdown lines
//   unit          string   'd' | 'h' | '$' (default 'd')
//   size          'xs' | 'sm' | 'md' (default 'md')
//   showLegend    boolean  (default true)
//   onSegmentClick (kind) => void   // 'used' | 'pending' | 'remaining' | 'overdrawn'
//   ariaLabel     string
//
// Status semantics:
//   used      → --color-accent (the "spent" portion)
//   pending   → --color-status-warning (awaiting approval)
//   remaining → --color-status-active (available)
//   overdrawn → --color-status-danger (used > entitlement)

const BAL_SIZES = {
  xs: { trackH: 6,  fontSize: 10, gap: 8  },
  sm: { trackH: 10, fontSize: 11, gap: 10 },
  md: { trackH: 14, fontSize: 13, gap: 14 },
};

function BalanceMeter({
  entitlement = 0,
  used = 0,
  pending = 0,
  accrual = 0,
  breakdown,
  unit = 'd',
  size = 'md',
  showLegend = true,
  onSegmentClick,
  ariaLabel = 'Balance',
  className,
  style,
}) {
  const sz = BAL_SIZES[size] || BAL_SIZES.md;
  const ent = Math.max(0, entitlement);
  const u = Math.max(0, used);
  const p = Math.max(0, pending);
  const remaining = Math.max(0, ent - u - p);
  const overdrawn = Math.max(0, u + p - ent);
  // Width of meter — entitlement = 100% (or used+pending if overdrawn)
  const scale = Math.max(ent, u + p);
  const pct = (n) => (scale > 0 ? (n / scale) * 100 : 0);

  const fmt = (n) => `${(+n).toLocaleString(undefined, { maximumFractionDigits: 1 })}${unit}`;

  return (
    <div className={'ds-balance-meter ' + (className || '')}
      role="img"
      aria-label={`${ariaLabel}: ${fmt(remaining)} remaining of ${fmt(ent)}, ${fmt(u)} used${pending ? ', ' + fmt(p) + ' pending' : ''}`}
      style={{
        fontFamily:'var(--font-sans)',
        color:'var(--color-text)',
        fontSize: sz.fontSize,
        ...style,
      }}>
      {/* Top line: headline numbers */}
      <div style={{
        display:'flex', alignItems:'baseline', justifyContent:'space-between',
        marginBottom: 6, gap: 12, flexWrap:'wrap',
      }}>
        <span style={{
          fontSize: sz.fontSize + 14, fontWeight: 600,
          fontVariantNumeric:'tabular-nums',
          color: overdrawn ? 'var(--color-status-danger)' : 'var(--color-text)',
        }}>{fmt(remaining)}</span>
        <span style={{color:'var(--color-text-muted)', fontSize: sz.fontSize - 1}}>
          remaining of <span style={{color:'var(--color-text)', fontWeight:500}}>{fmt(ent)}</span>
        </span>
      </div>

      {/* The segmented track */}
      <div style={{
        position:'relative', height: sz.trackH,
        background:'var(--color-surface-alt)',
        borderRadius: sz.trackH / 2,
        overflow:'hidden',
        border:'1px solid var(--color-border-subtle)',
      }}>
        <div
          tabIndex={onSegmentClick ? 0 : -1}
          onClick={() => onSegmentClick && onSegmentClick('used')}
          style={{
            position:'absolute', left:0, top:0, bottom:0,
            width: pct(u) + '%',
            background: 'var(--color-accent)',
            cursor: onSegmentClick ? 'pointer' : 'default',
          }}
          title={`Used: ${fmt(u)}`}
        />
        <div
          tabIndex={onSegmentClick ? 0 : -1}
          onClick={() => onSegmentClick && onSegmentClick('pending')}
          style={{
            position:'absolute', left: pct(u) + '%', top:0, bottom:0,
            width: pct(p) + '%',
            background: 'repeating-linear-gradient(135deg, var(--color-status-warning) 0 4px, color-mix(in oklab, var(--color-status-warning) 60%, white) 4px 8px)',
            cursor: onSegmentClick ? 'pointer' : 'default',
          }}
          title={`Pending: ${fmt(p)}`}
        />
        {overdrawn > 0 && (
          <div style={{
            position:'absolute', left: pct(ent) + '%', top:0, bottom:0,
            width: pct(overdrawn) + '%',
            background: 'repeating-linear-gradient(135deg, var(--color-status-danger) 0 3px, color-mix(in oklab, var(--color-status-danger) 60%, white) 3px 6px)',
          }} title={`Overdrawn: ${fmt(overdrawn)}`}/>
        )}
        {ent > 0 && scale > ent && (
          /* 100% line marker when scale exceeds entitlement */
          <span style={{
            position:'absolute', left: pct(ent) + '%', top:-2, bottom:-2, width: 1,
            background: 'var(--color-text-subtle)',
          }}/>
        )}
      </div>

      {showLegend && (
        <div style={{
          display:'flex', gap: sz.gap, marginTop: 8, flexWrap:'wrap',
          fontSize: sz.fontSize - 1, color:'var(--color-text-muted)',
        }}>
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={{width: 10, height: 10, borderRadius: 2, background:'var(--color-accent)'}}/>
            Used <span className="mono" style={{color:'var(--color-text)', fontVariantNumeric:'tabular-nums'}}>{fmt(u)}</span>
          </span>
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={{width: 10, height: 10, borderRadius: 2, background:'repeating-linear-gradient(135deg, var(--color-status-warning) 0 3px, color-mix(in oklab, var(--color-status-warning) 60%, white) 3px 6px)'}}/>
            Pending <span className="mono" style={{color:'var(--color-text)', fontVariantNumeric:'tabular-nums'}}>{fmt(p)}</span>
          </span>
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <span style={{width: 10, height: 10, borderRadius: 2, background:'var(--color-status-active)'}}/>
            Remaining <span className="mono" style={{color:'var(--color-text)', fontVariantNumeric:'tabular-nums'}}>{fmt(remaining)}</span>
          </span>
          {accrual > 0 && (
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <span style={{width: 10, height: 10, borderRadius: 2, background:'var(--color-surface-alt)', border:'1px solid var(--color-border)'}}/>
              Accruing <span className="mono" style={{color:'var(--color-text)', fontVariantNumeric:'tabular-nums'}}>{fmt(accrual)}</span>
            </span>
          )}
          {overdrawn > 0 && (
            <span style={{display:'inline-flex', alignItems:'center', gap:6, color:'var(--color-status-danger)'}}>
              <span style={{width: 10, height: 10, borderRadius: 2, background:'var(--color-status-danger)'}}/>
              Overdrawn <span className="mono" style={{color:'var(--color-status-danger)', fontVariantNumeric:'tabular-nums', fontWeight: 600}}>{fmt(overdrawn)}</span>
            </span>
          )}
        </div>
      )}

      {breakdown && breakdown.length > 0 && (
        <div style={{
          marginTop: 14, borderTop: '1px solid var(--color-border-subtle)',
          paddingTop: 10,
          display:'flex', flexDirection:'column', gap: 6,
        }}>
          <div className="label-eyebrow" style={{marginBottom: 4}}>By type</div>
          {breakdown.map((b, i) => (
            <div key={i} style={{display:'grid', gridTemplateColumns:'1fr 80px auto', gap: 8, alignItems:'center'}}>
              <span style={{color:'var(--color-text-muted)'}}>{b.label}</span>
              <div style={{
                position:'relative', height: 4,
                background:'var(--color-surface-alt)', borderRadius: 2,
              }}>
                <div style={{
                  position:'absolute', left:0, top:0, bottom:0,
                  width: ((b.used || 0) / (b.entitlement || 1)) * 100 + '%',
                  background: b.color || 'var(--color-accent)',
                  borderRadius: 2,
                }}/>
              </div>
              <span className="mono" style={{
                fontVariantNumeric:'tabular-nums',
                color: 'var(--color-text)',
                fontSize: sz.fontSize - 1,
              }}>{(b.used || 0)} / {(b.entitlement || 0)}{unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.BalanceMeter = BalanceMeter;
