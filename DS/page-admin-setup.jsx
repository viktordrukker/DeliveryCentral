// page-admin-setup.jsx — Admin Settings + Setup Wizard

// ─────────────────────────────────────────────────────────────────────────
// AdminSettings — platform settings + role presets + integrations registry
// ─────────────────────────────────────────────────────────────────────────

const INTEGRATIONS = [
  { kind:'jira',       name:'Jira PPM',                 status:'connected', kind_label:'Project sync',           mode:'read-only',   last:'2m ago',     note:null },
  { kind:'confluence', name:'Confluence',               status:'connected', kind_label:'External link tiles',    mode:'tile-link',   last:'14m ago',    note:null },
  { kind:'teams',      name:'Microsoft Teams',          status:'connected', kind_label:'Webhook notifications',  mode:'outbound',    last:'8m ago',     note:null },
  { kind:'m365',       name:'Microsoft 365',            status:'connected', kind_label:'Identity + hierarchy',   mode:'daily sync',  last:'today 06:00',note:null },
  { kind:'ldap',       name:'AD · LDAP',                status:'connected', kind_label:'Group → role mapping',   mode:'hourly sync', last:'42m ago',    note:null },
  { kind:'m365',       name:'Outlook free-busy',        status:'degraded',  kind_label:'Calendar overlap check', mode:'read-only',   last:'3h ago',     note:'Auth refresh needed' },
  { kind:'external',   name:'Snowflake cost rates',     status:'disabled',  kind_label:'External data feed',     mode:'weekly pull', last:'—',          note:null },
];

function AdminSettings() {
  return (
    <AppShell active="admin" context="Admin">
      <PageHeader
        breadcrumb={['Admin']}
        title="Admin"
        badges={<>
          <span className="badge badge-outline">Bank Bigfoot · prod</span>
          <StatusBadge tone="active">Healthy</StatusBadge>
        </>}
        subtitle={<>v12.3.4 · single-tenant install · last operator action 2m ago by <a href="#">you</a></>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="history"/> Audit log</button>
          <button className="btn btn-secondary btn-md"><Icon name="download"/> Backup config</button>
        </>}
        tabs={[
          { id:'platform',     label:'Platform' },
          { id:'roles',        label:'Roles & RBAC' },
          { id:'integrations', label:'Integrations', count:'7' },
          { id:'dicts',        label:'Dictionaries' },
          { id:'monitor',      label:'Monitoring' },
        ]}
        activeTab="integrations"
      />

      <div className="page-body" style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:20, alignItems:'flex-start'}}>
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* Health summary */}
          <div className="card">
            <div className="card-header"><h3>Integrations registry</h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="chip chip-active">All · 7</span>
                <span className="chip">Connected · 5</span>
                <span className="chip">Degraded · 1</span>
                <span className="chip">Disabled · 1</span>
                <button className="btn btn-primary btn-sm"><Icon name="plus"/> Add integration</button>
              </div>
            </div>
            <div style={{overflow:'auto'}}>
              <table className="table">
                <thead><tr>
                  <th>Integration</th>
                  <th>Purpose</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Last sync</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {INTEGRATIONS.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                          <div style={{
                            width:32, height:32, borderRadius:8,
                            background:'var(--color-surface-alt)',
                            color:'var(--color-accent)',
                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                          }}>
                            <Icon name={it.kind === 'external' ? 'link' : it.kind} size={16}/>
                          </div>
                          <div>
                            <div className="table-cell-strong">{it.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>{it.kind_label}</td>
                      <td><span className="badge badge-outline mono">{it.mode}</span></td>
                      <td>
                        {it.status === 'connected' && <StatusBadge tone="active">Connected</StatusBadge>}
                        {it.status === 'degraded' && <StatusBadge tone="warning">Degraded</StatusBadge>}
                        {it.status === 'disabled' && <StatusBadge tone="pending">Disabled</StatusBadge>}
                        {it.note && <div className="compact-sm muted" style={{marginTop:3}}>{it.note}</div>}
                      </td>
                      <td className="mono compact">{it.last}</td>
                      <td>
                        <div style={{display:'flex', gap:4, justifyContent:'flex-end'}}>
                          {it.status === 'degraded' && <button className="btn btn-secondary btn-sm">Retry auth</button>}
                          <button className="icon-btn icon-btn-sm" aria-label="Configure"><Icon name="settings"/></button>
                          <button className="icon-btn icon-btn-sm" aria-label="More"><Icon name="more-v"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Role RBAC matrix */}
          <div className="card">
            <div className="card-header"><h3>Roles & permissions</h3>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <span className="compact muted">7 roles · 38 permission groups</span>
                <button className="btn btn-secondary btn-sm">Edit role</button>
              </div>
            </div>
            <div style={{overflow:'auto'}}>
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Permission group</th>
                    <th style={{textAlign:'center'}}>Employee</th>
                    <th style={{textAlign:'center'}}>PM</th>
                    <th style={{textAlign:'center'}}>RM</th>
                    <th style={{textAlign:'center'}}>DM</th>
                    <th style={{textAlign:'center'}}>Director</th>
                    <th style={{textAlign:'center'}}>HR</th>
                    <th style={{textAlign:'center'}}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { p:'Read own profile',       r:[1,1,1,1,1,1,1] },
                    { p:'Read all profiles',      r:[0,'s','t','t',1,1,1] },
                    { p:'Edit positions · scope', r:[0,'p','p',0,1,0,1] },
                    { p:'Approve budgets',        r:[0,0,0,'p',1,0,1] },
                    { p:'Approve leave',          r:[0,0,0,'t',1,1,1] },
                    { p:'Activate project',       r:[0,0,0,0,1,0,1] },
                    { p:'Drop staffing models',   r:[0,0,0,0,0,0,1] },
                  ].map((row) => (
                    <tr key={row.p}>
                      <td className="table-cell-strong">{row.p}</td>
                      {row.r.map((v, i) => (
                        <td key={i} style={{textAlign:'center'}}>
                          {v === 1 ? <Icon name="check" size={14} style={{color:'var(--color-status-active)'}}/> :
                           v === 0 ? <span className="muted">—</span> :
                           v === 's' ? <span className="badge badge-info" style={{height:18}}>self</span> :
                           v === 't' ? <span className="badge badge-info" style={{height:18}}>team</span> :
                           v === 'p' ? <span className="badge badge-info" style={{height:18}}>project</span> : null}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Platform settings */}
          <div className="card">
            <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:4}}>
              <h3>Platform settings</h3>
              <span className="compact muted">All edits require explicit save · audit-logged · 1 unsaved change</span>
            </div>
            <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
              <div className="field">
                <label className="field-label">Tenant base currency</label>
                <select className="select" defaultValue="USD"><option>USD</option><option>EUR</option><option>GBP</option></select>
                <div className="field-hint">Used for portfolio rollups. Project currency unchanged.</div>
              </div>
              <div className="field">
                <label className="field-label">Fiscal year start</label>
                <input className="input mono" defaultValue="01 January"/>
              </div>
              <div className="field">
                <label className="field-label">Position SLA · open → first proposal</label>
                <div className="input-affix"><input className="input mono" defaultValue="14"/><span className="affix affix-right">days</span></div>
              </div>
              <div className="field">
                <label className="field-label">Budget variance auto-approval trigger</label>
                <div className="input-affix"><input className="input mono" defaultValue="5.0"/><span className="affix affix-right">% of baseline</span></div>
              </div>
              <div className="field">
                <label className="field-label">Multi-currency consolidation</label>
                <label style={{display:'flex', gap:10, alignItems:'center'}}><input type="checkbox" className="switch" defaultChecked/><span className="body-sm">FxRate from M365 daily refresh</span></label>
              </div>
              <div className="field">
                <label className="field-label">Color-blind RAG swap (org-wide default)</label>
                <label style={{display:'flex', gap:10, alignItems:'center'}}><input type="checkbox" className="switch"/><span className="body-sm">Off — users can enable per-account</span></label>
              </div>
            </div>
            <div className="card-footer">
              <span className="compact muted" style={{marginRight:'auto'}}>1 unsaved change · Position SLA</span>
              <button className="btn btn-ghost btn-md">Discard</button>
              <button className="btn btn-primary btn-md">Save & audit</button>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{display:'flex', flexDirection:'column', gap:16, alignSelf:'stretch'}}>
          <div className="card">
            <div className="card-header"><h3>System</h3></div>
            <div className="card-body">
              <dl className="dl">
                <dt>Version</dt>      <dd className="mono">12.3.4</dd>
                <dt>Region</dt>       <dd>UK-South</dd>
                <dt>DB size</dt>      <dd className="mono">8.4 GB</dd>
                <dt>People</dt>       <dd className="mono">186</dd>
                <dt>Audit chain</dt>  <dd><StatusBadge tone="active">Intact</StatusBadge></dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Backups</h3><StatusBadge tone="active">Healthy</StatusBadge></div>
            <div className="card-body">
              <dl className="dl">
                <dt>Last snapshot</dt>    <dd className="mono">14:00 UTC</dd>
                <dt>Retention</dt>        <dd>30 days · PITR</dd>
                <dt>Off-site mirror</dt>  <dd><StatusBadge tone="active">In sync</StatusBadge></dd>
                <dt>Right-to-erasure</dt> <dd className="mono">0 pending</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Service health</h3></div>
            <div className="card-body" style={{padding:'10px 20px', display:'flex', flexDirection:'column', gap:8}}>
              {[
                { svc:'API',          ms:42,  tone:'active' },
                { svc:'Outbox',       ms:18,  tone:'active' },
                { svc:'EVM cron',     ms:1840,tone:'warning' },
                { svc:'Notification', ms:96,  tone:'active' },
                { svc:'LDAP sync',    ms:312, tone:'active' },
              ].map((s) => (
                <div key={s.svc} style={{display:'flex', alignItems:'center', gap:8}}>
                  <span className={'tone-dot tone-'+s.tone}/>
                  <span className="body-sm" style={{flex:1}}>{s.svc}</span>
                  <span className="mono compact muted">{s.ms} ms</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{flex:1, minHeight:160}}>
            <div className="card-header"><h3>Recent operator actions</h3></div>
            <div className="card-body" style={{padding:'8px 20px 12px'}}>
              <div className="timeline">
                {[
                  { tone:'info',   when:'2m',    body:<>You · opened <strong>Admin Settings</strong></> },
                  { tone:'active', when:'1h',    body:<>You · approved <strong>Jira PPM</strong> reauth</> },
                  { tone:'active', when:'Mon',   body:<>You · enabled <strong>multi-currency</strong></> },
                  { tone:'warning',when:'Fri',   body:<>System · refresh failed for <strong>Outlook</strong></> },
                  { tone:'info',   when:'Thu',   body:<>Aaron P. · created tab <strong>"MCB Q3 backlog"</strong></> },
                ].map((e, i) => (
                  <div key={i} className={'tl-row tl-'+e.tone}>
                    <span className="tl-dot"/>
                    <div className="tl-body">{e.body}</div>
                    <span className="tl-meta">{e.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SetupWizard — 8-step install (preflight → migrations → tenant → admin → integrations → monitoring → seed → complete)
// ─────────────────────────────────────────────────────────────────────────

const SETUP_STEPS = [
  { n:1, t:'Preflight',     icon:'check-circle', sub:'OS + deps + ports' },
  { n:2, t:'Database',      icon:'docs',         sub:'Run migrations' },
  { n:3, t:'Tenant',        icon:'settings',     sub:'Identity + region' },
  { n:4, t:'Admin user',    icon:'lock',         sub:'First-boot operator' },
  { n:5, t:'Integrations',  icon:'link',         sub:'M365 · LDAP · Jira · Teams' },
  { n:6, t:'Monitoring',    icon:'eye',          sub:'Health · webhook' },
  { n:7, t:'Seed',          icon:'people',       sub:'Data + dictionaries' },
  { n:8, t:'Complete',      icon:'check',        sub:'Go-live' },
];

function SetupWizard() {
  return (
    <div className="dc-artboard" style={{background:'var(--color-bg)', height:'100%', overflow:'auto'}}>
      <div style={{maxWidth:1240, margin:'0 auto', padding:'40px 48px'}}>
        {/* Brand */}
        <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:32}}>
          <span style={{width:36, height:36, borderRadius:8, background:'var(--color-accent)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18}}>D</span>
          <div>
            <div style={{fontWeight:600}}>DeliverIT · Setup</div>
            <div className="compact muted">First-boot installer · v12.3.4</div>
          </div>
          <div style={{marginLeft:'auto', display:'flex', gap:8}}>
            <span className="badge badge-outline mono">localhost:8443</span>
            <StatusBadge tone="info">Step 5 of 8</StatusBadge>
          </div>
        </div>

        {/* Stepper */}
        <div className="card" style={{padding:'14px 18px', marginBottom:20}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(8,1fr)', alignItems:'center', gap:0}}>
            {SETUP_STEPS.map((s, i, arr) => {
              const state = s.n < 5 ? 'done' : s.n === 5 ? 'current' : 'todo';
              return (
                <React.Fragment key={s.n}>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:0}}>
                    <span style={{
                      width:28, height:28, borderRadius:'50%',
                      background: state === 'done' ? 'var(--color-status-active)' : state === 'current' ? 'var(--color-accent)' : 'var(--color-surface-alt)',
                      color: state === 'todo' ? 'var(--color-text-muted)' : '#fff',
                      border: '1px solid ' + (state === 'todo' ? 'var(--color-border-strong)' : 'transparent'),
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:600,
                      flexShrink:0,
                    }}>{state === 'done' ? <Icon name="check" size={12}/> : s.n}</span>
                    <div style={{textAlign:'center', minWidth:0}}>
                      <div className="compact" style={{fontWeight: state === 'current' ? 600 : 500}}>{s.t}</div>
                      <div className="compact-sm muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.sub}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step 5 content — Integrations */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 340px', gap:20, alignItems:'flex-start'}}>
          <div className="card">
            <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:6}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <span style={{width:32, height:32, borderRadius:8, background:'var(--color-accent-soft)', color:'var(--color-accent-text)', display:'inline-flex', alignItems:'center', justifyContent:'center'}}><Icon name="link" size={18}/></span>
                <h3 style={{fontSize:'var(--font-size-h2)'}}>Step 5 · Integrations</h3>
              </div>
              <span className="compact muted">Connect identity + workspace systems. Each is optional and can be added later. Required only if your org uses them today.</span>
            </div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:12}}>
              {[
                { kind:'m365', name:'Microsoft 365 directory', req:'Recommended', desc:'Pulls users + manager hierarchy. Daily sync.', done:true, sub:'tenant: bankbigfoot.onmicrosoft.com' },
                { kind:'ldap', name:'Active Directory · LDAP', req:'Recommended', desc:'Group → role mapping. Required for SSO.', done:true, sub:'host: ldap.bankbigfoot.internal · 389/TLS' },
                { kind:'jira', name:'Jira PPM',                req:'Optional',    desc:'Read-only project sync. Pulls issue counts + sprint velocity.', done:false, sub:'paste a personal access token' },
                { kind:'teams',name:'Microsoft Teams',          req:'Optional',    desc:'Outbound notifications via webhook per project channel.', done:false, sub:'webhook URL per channel' },
                { kind:'confluence', name:'Confluence',         req:'Optional',    desc:'External link tiles on Project Pulse.', done:false, sub:'no auth · stores space keys only' },
              ].map((it, i) => (
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'48px 1fr auto', gap:14,
                  padding:'14px 16px',
                  border:'1px solid ' + (it.done ? 'var(--color-status-active)' : 'var(--color-border)'),
                  background: it.done ? 'var(--color-status-active-bg)' : 'var(--color-surface)',
                  borderRadius:'var(--radius-card)',
                  alignItems:'center',
                }}>
                  <div style={{
                    width:40, height:40, borderRadius:8,
                    background:'var(--color-surface)', border:'1px solid var(--color-border)',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    color:'var(--color-accent)',
                  }}><Icon name={it.kind} size={20}/></div>
                  <div style={{minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span className="body-sm" style={{fontWeight:600}}>{it.name}</span>
                      <span className="badge badge-outline">{it.req}</span>
                      {it.done && <StatusBadge tone="active">Connected</StatusBadge>}
                    </div>
                    <div className="compact muted" style={{marginTop:3}}>{it.desc}</div>
                    <div className="compact-sm mono" style={{marginTop:6, color:'var(--color-text-subtle)'}}>{it.sub}</div>
                  </div>
                  <div>
                    {it.done
                      ? <button className="btn btn-ghost btn-sm">Re-configure</button>
                      : <button className="btn btn-secondary btn-sm">Configure…</button>}
                  </div>
                </div>
              ))}
            </div>
            <div className="card-footer">
              <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}><Icon name="chevron-left"/> Back</button>
              <button className="btn btn-secondary btn-md">Skip · come back later</button>
              <button className="btn btn-primary btn-md">Continue · Monitoring <Icon name="chevron-right"/></button>
            </div>
          </div>

          {/* Right rail */}
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div className="card">
              <div className="card-header"><h3>Preflight summary</h3></div>
              <div className="card-body" style={{padding:'10px 20px'}}>
                {[
                  { l:'OS', v:'Ubuntu 24.04 LTS', ok:true },
                  { l:'Docker', v:'24.0.7', ok:true },
                  { l:'Postgres', v:'16.4', ok:true },
                  { l:'Outbound', v:'M365 · LDAP · Jira · Teams', ok:true },
                  { l:'TLS', v:'Caddy + ACME', ok:true },
                  { l:'Backups', v:'Hourly snapshot · 30d', ok:true },
                ].map((r) => (
                  <div key={r.l} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px dashed var(--color-border-subtle)'}}>
                    <span className="compact muted">{r.l}</span>
                    <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      <span className="mono body-sm">{r.v}</span>
                      {r.ok && <Icon name="check-circle" size={14} style={{color:'var(--color-status-active)'}}/>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Help</h3></div>
              <div className="card-body" style={{padding:'12px 20px', display:'flex', flexDirection:'column', gap:8}}>
                <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 0'}}><Icon name="docs"/> Network allow-list runbook</a>
                <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 0'}}><Icon name="link"/> Integration adapter docs</a>
                <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 0'}}><Icon name="bell"/> Contact Bank Bigfoot platform team</a>
              </div>
            </div>
          </div>
        </div>

        <div style={{display:'flex', gap:12, marginTop:28, paddingTop:16, borderTop:'1px solid var(--color-border)', color:'var(--color-text-subtle)', fontSize:12}}>
          <span>Setup token: <span className="mono">DC-SETUP-7Q9X-A14R</span></span>
          <span style={{marginLeft:'auto'}}>v12.3.4 · single-tenant per-bank install</span>
        </div>
      </div>
    </div>
  );
}

window.AdminSettings = AdminSettings;
window.SetupWizard = SetupWizard;
