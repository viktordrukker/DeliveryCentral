// page-approvals.jsx — "Approvals Queue" — cross-domain unified queue.
// Grammar: Operational Queue + Inspector Panel pattern.
// Left: filterable list of approvals across sources (budget / activation / position-proposal / leave / case).
// Right: full one-screen-approval inspector with context + buttons.

const QUEUE = [
  { id:1, source:'position-proposal', tone:'warning', priority:'high',
    title:'Propose Priya Natarajan as Senior Frontend Eng',
    project:'Mercury Core Banking — UK', submitter:'Maya Kovács', amount:null, when:'2h ago', sla:'6h to SLA' },
  { id:2, source:'budget', tone:'danger', priority:'high',
    title:'Re-baseline Q3 budget · MCB-UK · −$184k',
    project:'Mercury Core Banking — UK', submitter:'Ethan Brooks', amount:184000, when:'4h ago', sla:'2d to decision' },
  { id:3, source:'activation', tone:'info', priority:'med',
    title:'Activate Project · Orion Treasury',
    project:'Orion Treasury Modernization', submitter:'Aaron Page', amount:null, when:'yesterday', sla:'5d to start' },
  { id:4, source:'leave', tone:'info', priority:'low',
    title:'Leave · 5d · 24–28 June',
    project:'Priya Natarajan', submitter:'Priya Natarajan', amount:null, when:'yesterday', sla:'no SLA' },
  { id:5, source:'case', tone:'warning', priority:'med',
    title:'Onboarding case · Lina Olsen',
    project:'HR', submitter:'Hannah Cole (HR)', amount:null, when:'2d ago', sla:'tomorrow' },
  { id:6, source:'position-proposal', tone:'warning', priority:'med',
    title:'Propose Tomás Reyes as QA · 100%',
    project:'Apollo Risk Platform', submitter:'Maya Kovács', amount:null, when:'2d ago', sla:'1d to SLA' },
  { id:7, source:'budget', tone:'warning', priority:'med',
    title:'Change request · Atlas ERP · +$62k for spike',
    project:'Atlas ERP Rollout', submitter:'Aaron Page', amount:62000, when:'3d ago', sla:'4d to decision' },
];

const SOURCE_META = {
  'position-proposal': { label:'Position proposal', icon:'position' },
  'budget':            { label:'Budget',             icon:'budget' },
  'activation':        { label:'Activation',         icon:'flag' },
  'leave':             { label:'Leave',              icon:'calendar' },
  'case':              { label:'HR case',            icon:'inbox' },
};

// Inspector card for the selected approval (Re-baseline Q3 budget)
function BudgetApprovalInspector() {
  return (
    <>
      <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:8}}>
        <div style={{display:'flex', alignItems:'center', gap:8, width:'100%'}}>
          <Icon name="budget" size={18} style={{color:'var(--color-status-danger)'}}/>
          <span className="label-eyebrow">Budget · Re-baseline</span>
          <StatusBadge tone="danger">High priority</StatusBadge>
          <span style={{flex:1}}/>
          <span className="compact muted mono">2d to decision · req 4h ago</span>
        </div>
        <h3 style={{fontSize:'var(--font-size-h2)'}}>Re-baseline Q3 budget · MCB-UK · −$184k</h3>
        <div className="compact muted">
          Submitter: <strong style={{color:'var(--color-text)'}}>Ethan Brooks</strong> · PM ·{' '}
          Project: <a href="#">Mercury Core Banking — UK</a>
        </div>
      </div>

      <div className="card-body" style={{display:'flex', flexDirection:'column', gap:16}}>
        {/* Key figures — one-screen approval context */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10}}>
          <div style={{padding:12, borderRadius:'var(--radius-card)', background:'var(--color-surface-alt)'}}>
            <div className="compact-sm muted">Baseline</div>
            <div className="mono" style={{fontSize:18, fontWeight:600}}>$2.24M</div>
          </div>
          <div style={{padding:12, borderRadius:'var(--radius-card)', background:'var(--color-surface-alt)'}}>
            <div className="compact-sm muted">Actuals YTD</div>
            <div className="mono" style={{fontSize:18, fontWeight:600}}>$2.02M</div>
          </div>
          <div style={{padding:12, borderRadius:'var(--radius-card)', background:'var(--color-surface-alt)'}}>
            <div className="compact-sm muted">EAC at completion</div>
            <div className="mono" style={{fontSize:18, fontWeight:600, color:'var(--color-status-danger)'}}>$2.42M</div>
          </div>
          <div style={{padding:12, borderRadius:'var(--radius-card)', background:'var(--color-status-danger-bg)'}}>
            <div className="compact-sm" style={{color:'var(--color-status-danger)'}}>Variance</div>
            <div className="mono" style={{fontSize:18, fontWeight:600, color:'var(--color-status-danger)'}}>−$184k · −8.2%</div>
          </div>
        </div>

        {/* Cause breakdown */}
        <div>
          <div className="label-eyebrow" style={{marginBottom:8}}>Variance breakdown</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {[
              { label:'FX impact (GBP→USD)',       value:-112000, max:200000, why:'Q2 FX consolidation' },
              { label:'COBOL specialist premium',   value:-48000,  max:200000, why:'Position open >30d, market rate +12%' },
              { label:'Regulatory scope add',       value:-36000,  max:200000, why:'FCA Q3 filing additions' },
              { label:'Vendor underrun · Equinix',  value:+12000,  max:200000, why:'Negotiated multi-year deal' },
            ].map((r) => (
              <div key={r.label} style={{display:'grid', gridTemplateColumns:'1.2fr 1.6fr 110px', gap:12, alignItems:'center'}}>
                <div className="body-sm">{r.label}</div>
                <VarianceBar value={r.value} max={r.max}/>
                <div className="mono right tnum" style={{textAlign:'right', color: r.value < 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}}>
                  {r.value > 0 ? '+' : '−'}<Money value={r.value} compact/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast curve summary */}
        <div className="card" style={{boxShadow:'none', borderColor:'var(--color-border-subtle)'}}>
          <div className="card-body" style={{display:'flex', alignItems:'center', gap:18}}>
            <Sparkline data={[1.6, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4]} width={200} height={48} tone="danger"/>
            <div>
              <div className="compact muted">Forecast burn · plan vs proj</div>
              <div className="body-sm" style={{fontWeight:500, marginTop:2}}>At current burn rate, baseline exhausted by <span className="mono">14 Oct 2026</span> · 8 weeks early.</div>
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="field">
          <label className="field-label">Decision comment <span className="muted compact-sm">(required)</span></label>
          <textarea className="textarea" rows="3" placeholder="Justification, conditions, attachments…" defaultValue="Approve re-baseline. Trigger fortnightly variance review until end Q3."/>
        </div>

        {/* Quick links */}
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn btn-tertiary btn-sm"><Icon name="budget"/> Full EVM</button>
          <button className="btn btn-tertiary btn-sm"><Icon name="docs"/> Change request</button>
          <button className="btn btn-tertiary btn-sm"><Icon name="history"/> Prior approvals (3)</button>
        </div>
      </div>

      <div className="card-footer">
        <span style={{display:'flex', alignItems:'center', gap:8, marginRight:'auto', color:'var(--color-text-muted)'}}>
          <span className="kbd">A</span>
          <span className="compact">Approve</span>
          <span style={{margin:'0 6px'}}>·</span>
          <span className="kbd">R</span>
          <span className="compact">Reject</span>
        </span>
        <button className="btn btn-ghost btn-md">Escalate to Director</button>
        <button className="btn btn-danger btn-md">Reject</button>
        <button className="btn btn-primary btn-md">Approve re-baseline</button>
      </div>
    </>
  );
}

function ApprovalsQueue() {
  return (
    <AppShell active="approvals" context="Approvals">
      <PageHeader
        breadcrumb={['Approvals']}
        title="Approvals queue"
        badges={<>
          <StatusBadge tone="warning">7 awaiting you</StatusBadge>
          <span className="badge badge-outline">2 overdue</span>
        </>}
        subtitle={<>Cross-domain. Position proposals · Budget changes · Activations · Leave · HR cases. Sorted by SLA urgency.</>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="filter"/> Filters</button>
          <button className="btn btn-secondary btn-md"><Icon name="history"/> History</button>
        </>}
      />

      <div className="page-body" style={{display:'grid', gridTemplateColumns:'minmax(340px, 420px) 1fr', gap:16, alignItems:'flex-start'}}>
        <div style={{display:'flex', flexDirection:'column', gap:12, position:'sticky', top:16, maxHeight:'calc(100vh - 220px)', overflow:'hidden'}}>
          {/* Source filter chips */}
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            <span className="chip chip-active">All · 7</span>
            <span className="chip">Positions · 2</span>
            <span className="chip">Budget · 2</span>
            <span className="chip">Activation · 1</span>
            <span className="chip">Leave · 1</span>
            <span className="chip">HR · 1</span>
          </div>

          {/* List */}
          <div className="card" style={{overflow:'hidden', maxHeight:'calc(100vh - 280px)', display:'flex', flexDirection:'column'}}>
            <div style={{flex:1, overflow:'auto'}}>
              {QUEUE.map((q, i) => {
                const selected = q.id === 2;
                const meta = SOURCE_META[q.source];
                return (
                  <div key={q.id} style={{
                    padding:'12px 14px',
                    borderBottom: i < QUEUE.length-1 ? '1px solid var(--color-border-subtle)' : 0,
                    background: selected ? 'var(--color-row-selected)' : 'transparent',
                    borderLeft: '3px solid ' + (selected ? 'var(--color-accent)' : 'transparent'),
                    cursor:'pointer',
                  }}>
                    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                      <Icon name={meta.icon} size={14} style={{color:'var(--color-text-muted)'}}/>
                      <span className="compact muted">{meta.label}</span>
                      <span className={'tone-dot tone-'+q.tone}/>
                      <span style={{flex:1}}/>
                      <span className="compact-sm muted">{q.when}</span>
                    </div>
                    <div className="body-sm" style={{fontWeight: selected ? 600 : 500, lineHeight:1.35}}>{q.title}</div>
                    <div className="compact-sm muted" style={{marginTop:4, display:'flex', alignItems:'center', gap:6}}>
                      <Avatar name={q.submitter} size="sm"/>
                      <span style={{flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{q.submitter}</span>
                      <span className="mono" style={{color: q.sla.includes('to SLA') ? 'var(--color-status-warning)' : 'var(--color-text-subtle)'}}>{q.sla}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inspector — selected approval */}
        <div className="card" style={{position:'sticky', top:16, alignSelf:'flex-start'}}>
          <BudgetApprovalInspector/>
        </div>
      </div>
    </AppShell>
  );
}

window.ApprovalsQueue = ApprovalsQueue;
