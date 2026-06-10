// chrome.jsx — shared app chrome: AppShell with sidebar, topbar, PageHeader.
// Used by all page templates so they read as part of one product.

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { id: 'home',     icon: 'home',     label: 'Home' },
      { id: 'projects', icon: 'projects', label: 'Projects', count: '24' },
      { id: 'approvals',icon: 'approvals',label: 'Approvals', count: '7' },
      { id: 'reports',  icon: 'reports',  label: 'Reports' },
    ],
  },
  {
    label: 'Workforce',
    items: [
      { id: 'people',   icon: 'people',   label: 'People' },
      { id: 'bench',    icon: 'bench',    label: 'Bench', count: '12' },
      { id: 'teams',    icon: 'team',     label: 'Teams' },
      { id: 'hr',       icon: 'inbox',    label: 'HR Queue', count: '3' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'admin',    icon: 'admin',    label: 'Admin' },
      { id: 'settings', icon: 'settings', label: 'Settings' },
    ],
  },
];

function Sidebar({ active = 'home', subBrand = 'Bank Bigfoot · prod' }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="mark">D</span>
        <span style={{display:'flex', flexDirection:'column', lineHeight:1.2}}>
          <span style={{fontSize:13}}>DeliverIT</span>
          <span style={{fontSize:10, color:'var(--color-text-subtle)', letterSpacing:'0.04em'}}>{subBrand}</span>
        </span>
      </div>
      <div style={{flex:1, overflow:'auto', padding:'8px 0 16px'}}>
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="sidebar-section">
            <div className="sidebar-section-label">{g.label}</div>
            {g.items.map((it) => (
              <div key={it.id} className={'nav-item' + (active === it.id ? ' active' : '')}>
                <Icon name={it.icon} className="icon"/>
                <span>{it.label}</span>
                {it.count ? <span className="count">{it.count}</span> : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{borderTop:'1px solid var(--color-border)', padding:'10px 12px', display:'flex', gap:10, alignItems:'center'}}>
        <span className="avatar" data-hue="6">EB</span>
        <div style={{display:'flex', flexDirection:'column', minWidth:0, flex:1}}>
          <span style={{fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>Ethan Brooks</span>
          <span style={{fontSize:11, color:'var(--color-text-subtle)'}}>Project Manager</span>
        </div>
        <button className="icon-btn icon-btn-sm" aria-label="Account menu"><Icon name="more-v"/></button>
      </div>
    </aside>
  );
}

function Topbar({ context = 'Delivery Central Platform' }) {
  return (
    <div className="topbar">
      <button className="icon-btn" aria-label="Toggle sidebar"><Icon name="more"/></button>
      <div style={{position:'relative', flex:'0 1 360px'}}>
        <Icon name="search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-subtle)'}}/>
        <input className="input" placeholder={'Search ' + context + '…'} style={{paddingLeft:30, height:32}}/>
        <span className="kbd" style={{position:'absolute', right:8, top:'50%', transform:'translateY(-50%)'}}>⌘K</span>
      </div>
      <div style={{flex:1}}></div>
      <button className="btn btn-tertiary btn-sm"><Icon name="plus"/> New</button>
      <button className="icon-btn" aria-label="Notifications" style={{position:'relative'}}>
        <Icon name="bell"/>
        <span style={{position:'absolute', top:6, right:8, width:6, height:6, borderRadius:'50%', background:'var(--color-status-danger)'}}/>
      </button>
      <button className="icon-btn" aria-label="Help"><Icon name="info"/></button>
    </div>
  );
}

function PageHeader({ breadcrumb = [], title, subtitle, badges, actions, tabs, activeTab }) {
  return (
    <div className="page-header" style={{flexDirection:'column', alignItems:'stretch', gap:4, paddingTop:10, paddingBottom: tabs ? 0 : 10}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:16}}>
        <div style={{minWidth:0}}>
          {breadcrumb.length ? (
            <div className="breadcrumb" style={{marginBottom:2}}>
              {breadcrumb.map((b, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="sep"><Icon name="chevron-right" size={12}/></span>}
                  {i === breadcrumb.length - 1
                    ? <span className="current">{b}</span>
                    : <a href="#">{b}</a>}
                </React.Fragment>
              ))}
            </div>
          ) : null}
          <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
            <h1 className="h2" style={{margin:0}}>{title}</h1>
            {badges}
          </div>
          {subtitle && <div className="body-sm muted" style={{marginTop:2}}>{subtitle}</div>}
        </div>
        {actions ? <div style={{display:'flex', gap:8, flexShrink:0}}>{actions}</div> : null}
      </div>
      {tabs ? (
        <div className="tabs" style={{marginTop:6}}>
          {tabs.map((t) => (
            <div key={t.id} className={'tab' + (t.id === activeTab ? ' active' : '')}>
              {t.label}
              {t.count ? <span className="count">{t.count}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AppShell({ active, context, children }) {
  return (
    <div className="page">
      <Sidebar active={active}/>
      <div className="page-inner">
        <Topbar context={context}/>
        {children}
      </div>
    </div>
  );
}

// Initials helper — pull first letters of first + last token
const initials = (name) => name.split(/\s+/).map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
// Stable hue 1..8 from name
const nameHue = (name) => ((Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 8) + 1);
const Avatar = ({ name, size }) => (
  <span className={'avatar' + (size === 'sm' ? ' avatar-sm' : size === 'lg' ? ' avatar-lg' : size === 'xl' ? ' avatar-xl' : '')} data-hue={nameHue(name)}>{initials(name)}</span>
);

// Tone-aware status badge
const StatusBadge = ({ tone = 'pending', children }) => {
  const cls = {
    active: 'badge badge-active', warning: 'badge badge-warning',
    danger: 'badge badge-danger', critical: 'badge badge-critical',
    info: 'badge badge-info', accent: 'badge badge-accent',
    pending: 'badge',
  }[tone] || 'badge';
  return <span className={cls}><span className="dot"/>{children}</span>;
};

// Tabular money — never break alignment
const Money = ({ value, currency = 'USD', compact = false }) => {
  const abs = Math.abs(value);
  let display;
  if (compact && abs >= 1_000_000) display = (value / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  else if (compact && abs >= 1_000) display = (value / 1_000).toFixed(1).replace(/\.?0+$/, '') + 'k';
  else display = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const sign = value < 0 ? '–' : '';
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';
  return <span className="tnum">{sign}{sym}{display}</span>;
};

const Pct = ({ value, sign = false }) => {
  const s = (sign && value > 0 ? '+' : '') + value.toFixed(1) + '%';
  return <span className="tnum">{s}</span>;
};

// Inline svg sparkline — series of numbers 0..N
function Sparkline({ data, width = 100, height = 28, tone = 'accent' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;
  const color = {
    accent: 'var(--color-accent)',
    active: 'var(--color-status-active)',
    warning: 'var(--color-status-warning)',
    danger: 'var(--color-status-danger)',
    info: 'var(--color-status-info)',
  }[tone] || 'var(--color-accent)';
  return (
    <svg width={width} height={height} style={{display:'block', overflow:'visible'}}>
      <path d={area} fill={color} opacity="0.10"/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.5" fill={color}/>
    </svg>
  );
}

// Mini bar chart  — series of numbers
function MiniBars({ data, width = 120, height = 28, tone = 'accent', threshold }) {
  const max = Math.max(...data);
  const w = width / data.length - 2;
  const color = {
    accent: 'var(--color-accent)', active: 'var(--color-status-active)',
    warning: 'var(--color-status-warning)', danger: 'var(--color-status-danger)',
  }[tone] || 'var(--color-accent)';
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 2);
        const over = threshold != null && v > threshold;
        return <rect key={i} x={i*(w+2)} y={height-h} width={w} height={h} rx="1.5"
          fill={over ? 'var(--color-status-warning)' : color} opacity={over ? 1 : 0.85}/>;
      })}
      {threshold != null && (() => {
        const y = height - (threshold/max)*(height-2);
        return <line x1="0" x2={width} y1={y} y2={y} stroke="var(--color-text-subtle)" strokeDasharray="2 2" opacity="0.6"/>;
      })()}
    </svg>
  );
}

// Variance bar — split positive/negative around center
function VarianceBar({ value, max, tone = 'auto' }) {
  // value can be -max..+max; we render a bar on the left or right of center
  const pct = Math.min(1, Math.abs(value) / max);
  const width = (pct * 50).toFixed(1) + '%';
  const left = value < 0 ? (50 - pct*50).toFixed(1) + '%' : '50%';
  const isNeg = value < 0;
  const cls = (tone === 'auto') ? (isNeg ? 'neg' : '') : (tone === 'danger' ? 'neg' : '');
  return (
    <div className="varbar" role="img" aria-label={`Variance ${value}`}>
      <i className={cls} style={{ left, width }}/>
    </div>
  );
}

// Donut — single ring
function Donut({ value, max = 100, size = 56, tone = 'accent', thickness = 6 }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = {
    accent: 'var(--color-accent)', active: 'var(--color-status-active)',
    warning: 'var(--color-status-warning)', danger: 'var(--color-status-danger)',
    info: 'var(--color-status-info)',
  }[tone] || 'var(--color-accent)';
  return (
    <svg width={size} height={size} style={{display:'block'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={thickness}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thickness}
        strokeDasharray={`${c*pct} ${c}`} strokeDashoffset={c*0.25} transform={`rotate(-90 ${size/2} ${size/2})`}
        strokeLinecap="round"/>
    </svg>
  );
}

// Gantt-style row for plan tab
function GanttRow({ label, start, end, total = 100, color = 'var(--color-accent)', marker, dim }) {
  const left = (start / total) * 100;
  const width = ((end - start) / total) * 100;
  return (
    <div style={{display:'grid', gridTemplateColumns:'160px 1fr', gap:12, alignItems:'center', padding:'6px 0'}}>
      <span className="body-sm" style={{color: dim ? 'var(--color-text-muted)' : 'var(--color-text)'}}>{label}</span>
      <div style={{position:'relative', height:18, background:'var(--color-surface-alt)', borderRadius:4}}>
        <div style={{position:'absolute', left: left+'%', width: width+'%', top:3, bottom:3, background:color, borderRadius:3, opacity: dim ? 0.5 : 1}}/>
        {marker != null && (
          <div style={{position:'absolute', left: marker+'%', top:-2, bottom:-2, width:2, background:'var(--color-status-warning)', borderRadius:1}}/>
        )}
      </div>
    </div>
  );
}

Object.assign(window, {
  Sidebar, Topbar, PageHeader, AppShell,
  Avatar, StatusBadge, Money, Pct, initials, nameHue,
  Sparkline, MiniBars, VarianceBar, Donut, GanttRow,
});
