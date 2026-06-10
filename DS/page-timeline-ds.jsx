// page-timeline-ds.jsx — DS-level Timeline component documentation page.
// Every PositionFillStatus rendered as a bar, plus heat band thresholds,
// drag handles, snap preview, group header sigma, and a props matrix.

const STATES = [
  { key:'DRAFT',      label:'Draft',      cls:'tl-draft',      desc:'PM shaping the position; no candidates yet.' },
  { key:'OPEN',       label:'Open',       cls:'tl-open',       desc:'Accepting candidates · SLA clock running.' },
  { key:'PROPOSED',   label:'Proposed',   cls:'tl-proposed',   desc:'A person is named, awaiting PM confirmation.' },
  { key:'BOOKED',     label:'Booked',     cls:'tl-booked',     desc:'Confirmed but not yet started.' },
  { key:'ONBOARDING', label:'Onboarding', cls:'tl-onboarding', desc:'In transition · cleared, not yet productive.' },
  { key:'ASSIGNED',   label:'Assigned',   cls:'tl-assigned',   desc:'Working state · billable, time logged.' },
  { key:'ON_HOLD',    label:'On hold',    cls:'tl-hold',       desc:'Paused — do not double-book the person.' },
  { key:'RELEASED',   label:'Released',   cls:'tl-released',   desc:'Terminal · person back to bench.' },
];

function TimelineDS() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:24, maxWidth:720}}>
        <div className="label-eyebrow">DeliverIT · Timeline</div>
        <h1 className="h1" style={{marginTop:6, marginBottom:6}}>&lt;Timeline/&gt; component</h1>
        <p className="body muted">
          The single primitive that powers <strong>Project Plan</strong>, <strong>Distribution Studio</strong> and the inline-row lifecycle column on <strong>Staffing Desk</strong>. Bars carry meaning via <em>both</em> fill color and pattern — so they read at any width, including the 12-px sliver an over-allocated person gets in a dense planner.
        </p>
      </div>

      {/* ── Live component demo ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <h3>Live · &lt;Timeline/&gt;</h3>
          <span className="compact muted">The same component used on Staffing Desk + Project Plan.</span>
        </div>
        <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr', gap:24}}>
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Stacked · md · overallocation bands on</div>
            <window.Timeline
              variant="stacked"
              size="md"
              today={new Date(2026, 4, 23)}
              rangeStart={new Date(2026, 1, 1)}
              rangeEnd={new Date(2027, 1, 1)}
              segments={[
                { id:1, startDate:new Date(2026,1,1),  endDate:new Date(2026,6,1),  status:'assigned', allocationPercent:100, label:'Jade · 100%' },
                { id:2, startDate:new Date(2026,5,1),  endDate:new Date(2026,10,1), status:'proposed', allocationPercent:50,  label:'Echo · 50%' },
                { id:3, startDate:new Date(2026,7,1),  endDate:new Date(2027,0,1),  status:'booked',   allocationPercent:50,  label:'Helix · 50%' },
                { id:4, startDate:new Date(2026,11,1), endDate:new Date(2027,1,1),  status:'open',     allocationPercent:80,  label:'OPEN · 80%' },
              ]}
              markers={[
                { date:new Date(2026,5,15), kind:'flag', color:'var(--color-status-info)', label:'Gate 3 — FCA filing' },
              ]}
            />
            <div className="compact muted" style={{marginTop:8}}>Months 6\u20139 stack to 200% \u2192 dark-red band. Bars are height-proportional so 100% + 50% + 50% reads as one full track without overlapping noise.</div>
          </div>
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Bar · sm · one row per segment (audit / lifecycle history)</div>
            <window.Timeline
              variant="bar"
              size="sm"
              today={new Date(2026, 4, 23)}
              segments={[
                { id:'a', startDate:new Date(2025,8,1),  endDate:new Date(2026,1,15), status:'released', label:'Atlas ERP — Lead' },
                { id:'b', startDate:new Date(2026,2,1),  endDate:new Date(2026,4,18), status:'assigned', label:'Mercury — Senior FE' },
                { id:'c', startDate:new Date(2026,4,18), endDate:new Date(2026,5,16), status:'hold',     label:'On hold — bench' },
                { id:'d', startDate:new Date(2026,5,16), endDate:new Date(2026,11,1), status:'proposed', label:'MCB-UK — Senior FE 80%' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Usage code ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><h3>Usage</h3><span className="compact muted">Drop-in. Stateless &mdash; parent owns segments.</span></div>
        <div className="card-body">
          <pre style={{
            margin:0, padding:14,
            background:'var(--color-surface-alt)',
            border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-card)',
            fontFamily:'var(--font-mono)', fontSize:12, lineHeight:1.5,
            color:'var(--color-text)',
            whiteSpace:'pre-wrap', overflow:'auto',
          }}>{`import { Timeline } from '@/components/ds/Timeline';

<Timeline
  segments={[
    { id:'1', startDate:'2026-02-01', endDate:'2026-07-01',
      status:'assigned', allocationPercent:100, label:'Jade · 100%' },
    { id:'2', startDate:'2026-06-01', endDate:'2026-10-01',
      status:'proposed', allocationPercent:50,  label:'Echo · 50%' },
  ]}
  variant="stacked"        // 'stacked' | 'bar'
  size="md"                // 'xs' | 'sm' | 'md' | 'lg'
  today={new Date()}       // optional — defaults to today
  showOverallocationBands  // paint Σ>100 weeks behind bars
  onSegmentClick={(s) => router.push(\`/positions/\${s.id}\`)}
  onSegmentChange={(s, range) => scenario.set(s.id, range)}
  onSegmentChangeCommit={(s, range) => mutate.commit(s.id, range)}
  renderHoverCard={(s) => <CustomHover seg={s}/>}
  markers={[{ date:'2026-06-15', kind:'flag', label:'Gate 3' }]}
/>`}</pre>
        </div>
      </div>

      {/* ── Lifecycle bars ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <h3>Lifecycle states</h3>
          <span className="compact muted">8 states · pattern + color · no text required to disambiguate</span>
        </div>
        <div className="card-body" style={{display:'grid', gridTemplateColumns:'180px 220px 1fr', gap:'12px 24px', alignItems:'center'}}>
          {STATES.map((s) => (
            <React.Fragment key={s.key}>
              <span className="mono compact" style={{color:'var(--color-text-muted)'}}>{s.key}</span>
              <div className={'tl-bar ' + s.cls} style={{width:'100%'}}>
                <span>{s.label} · 80%</span>
                <span className="tl-handle left"/>
                <span className="tl-handle right"/>
              </div>
              <span className="compact muted">{s.desc}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Heat band thresholds ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <h3>Overallocation heat band</h3>
          <span className="compact muted">Painted ABOVE a group header when aggregate allocation crosses a threshold.</span>
        </div>
        <div className="card-body" style={{display:'flex', flexDirection:'column', gap:14}}>
          {[
            { label:'100–119%', cls:'h100', desc:'Slight stretch · advisory · grey-amber',  bars: [1,1,1,2,1,1] },
            { label:'120–149%', cls:'h120', desc:'Sustained over · amber',                  bars: [1,2,2,3,2,2] },
            { label:'150–199%', cls:'h150', desc:'Conflicting commitments · red',           bars: [2,3,3,4,3,3] },
            { label:'≥ 200%',   cls:'h200', desc:'Critical · double booking · dark red',     bars: [3,4,4,4,4,4] },
          ].map((b) => (
            <div key={b.label} style={{display:'grid', gridTemplateColumns:'160px 1fr 280px', gap:24, alignItems:'center'}}>
              <span className="mono compact" style={{color:'var(--color-text-muted)'}}>{b.label}</span>
              <div className="tl-heat">
                {b.bars.map((n, i) => <i key={i} className={'h'+ ([100,120,150,200][n-1])}/>)}
              </div>
              <span className="compact muted">{b.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Drag · resize · snap states ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header">
          <h3>Drag · resize · snap</h3>
          <span className="compact muted">Bars snap to the week grid; the snap preview shows where the drop will land.</span>
        </div>
        <div className="card-body" style={{display:'flex', flexDirection:'column', gap:18}}>
          {/* Resting bar */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Resting · hover handles fade in</div>
            <div style={{position:'relative', height:34, background:'var(--color-surface-alt)', borderRadius:4, padding:6}}>
              <div className="tl-bar tl-assigned" style={{width:240}}>
                <span>Priya N. · 80%</span>
                <span className="tl-handle left"/><span className="tl-handle right"/>
              </div>
            </div>
          </div>
          {/* Dragging — original bar dimmed, snap preview shown */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Mid-drag · snap preview ghosted to week boundary</div>
            <div style={{position:'relative', height:34, background:'var(--color-surface-alt)', borderRadius:4, padding:6}}>
              <div className="tl-bar tl-assigned dragging" style={{width:240, position:'absolute', left:60, top:6, opacity:0.55}}>
                <span>Priya N. · 80%</span>
              </div>
              <div className="tl-bar snap" style={{width:240, position:'absolute', left:180, top:6}}>
                <span>Snap · W26</span>
              </div>
            </div>
          </div>
          {/* Resize invalid — bar touches a hold period */}
          <div>
            <div className="label-eyebrow" style={{marginBottom:6}}>Invalid resize · would collide with ON_HOLD on the same person</div>
            <div style={{position:'relative', height:34, background:'var(--color-surface-alt)', borderRadius:4, padding:6, display:'flex', gap:6}}>
              <div className="tl-bar tl-assigned" style={{flex:'0 0 200px', boxShadow:'0 0 0 2px var(--color-status-danger)'}}>
                Priya N. · 80%
              </div>
              <div className="tl-bar tl-hold" style={{flex:'0 0 80px'}}>
                Hold
              </div>
            </div>
            <div className="compact" style={{color:'var(--color-status-danger)', marginTop:4}}>
              <Icon name="alert" size={11}/> Cannot extend assignment into an On-Hold period for the same person.
            </div>
          </div>
        </div>
      </div>

      {/* ── Group header sigma ── */}
      <div className="card" style={{marginBottom:20}}>
        <div className="card-header"><h3>Group header · weekly Σ aggregate</h3></div>
        <div className="card-body" style={{padding:0}}>
          <div className="pl-group-head">
            <Icon name="chevron-down" className="chev" size={14}/>
            <span>Frontend Customer Channel</span>
            <span className="badge badge-outline">4 positions</span>
            <div className="pl-sigma">
              <Sparkline data={[80, 100, 120, 140, 120, 110, 95, 110, 130, 120, 105, 90]} width={140} height={20} tone="warning"/>
              <span className="sigma-val">Σ 105% · 12w</span>
            </div>
          </div>
          {/* Heat band */}
          <div style={{padding:'4px 14px'}}>
            <div className="tl-heat">
              <i className="h100"/><i className="h100"/><i className="h120"/><i className="h150"/><i className="h120"/><i className="h100"/><i/><i className="h100"/><i className="h120"/><i className="h120"/><i/><i/>
            </div>
          </div>
          {/* Sample bars */}
          <div style={{padding:'6px 14px 14px', display:'flex', flexDirection:'column', gap:6}}>
            <div className="tl-bar tl-assigned" style={{width:'58%', marginLeft:'8%'}}>Priya N. · 80%</div>
            <div className="tl-bar tl-booked"   style={{width:'42%', marginLeft:'18%'}}>Diego C. · 100%</div>
            <div className="tl-bar tl-open"     style={{width:'33%', marginLeft:'42%'}}>OPEN · L4 FE · 80%</div>
            <div className="tl-bar tl-proposed" style={{width:'24%', marginLeft:'55%'}}>Saoirse W. · 80%</div>
          </div>
        </div>
      </div>

      {/* ── Props matrix ── */}
      <div className="card">
        <div className="card-header"><h3>Props · Storybook</h3></div>
        <div style={{overflow:'auto'}}>
          <table className="table table-compact">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Example</th><th>Notes</th></tr></thead>
            <tbody>
              {[
                { p:'bars',          t:'TimelineBar[]',                d:'[]',          ex:'[{start, end, status, label}]', n:'Required.' },
                { p:'horizon',       t:'{start: Date; end: Date}',     d:'next 12 weeks',ex:'{start: 2026-06-01, …}',       n:'Sets the visible range.' },
                { p:'unit',          t:'"week" | "month"',             d:'"week"',       ex:'"week"',                       n:'Snap target.' },
                { p:'today',         t:'Date',                          d:'new Date()',  ex:'2026-05-23',                  n:'Renders the NOW marker.' },
                { p:'groups',        t:'TimelineGroup[]',              d:'[]',          ex:'[{id, label, bars[]}]',        n:'Collapsible swimlanes.' },
                { p:'heat',          t:'boolean',                       d:'false',       ex:'true',                         n:'Paint heat band above group when Σ > 100%.' },
                { p:'onMove',        t:'(barId, newStart, newEnd)\u00a0=> void', d:'noop', ex:'mutate.ts',           n:'Snaps to unit by default.' },
                { p:'onResize',      t:'(barId, edge, newDate)\u00a0=> void',    d:'noop', ex:'mutate.ts',          n:'edge = "left" | "right".' },
                { p:'readOnly',      t:'boolean',                       d:'false',       ex:'true',                         n:'Disables drag/resize, hides handles.' },
                { p:'compact',       t:'boolean',                       d:'false',       ex:'true',                         n:'Smaller row height + smaller bar font.' },
                { p:'onBarClick',    t:'(barId) => void',              d:'noop',         ex:'navigate(/positions/:id)',     n:'Falls back to opening position detail.' },
              ].map((r) => (
                <tr key={r.p}>
                  <td className="mono compact">{r.p}</td>
                  <td className="mono compact muted">{r.t}</td>
                  <td className="mono compact">{r.d}</td>
                  <td className="mono compact" style={{color:'var(--color-text-muted)'}}>{r.ex}</td>
                  <td className="compact muted">{r.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

window.TimelineDS = TimelineDS;
