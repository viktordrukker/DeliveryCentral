// page-extras.jsx — Create Project Wizard, Auth, Position Detail, Project Money tab

// ─────────────────────────────────────────────────────────────────────────
// CreateProjectWizard — 3-step (Identity → Positions+Milestones → Activation)
// ─────────────────────────────────────────────────────────────────────────
function CreateProjectWizard() {
  return (
    <AppShell active="projects" context="Create project">
      <PageHeader
        breadcrumb={['Projects', 'New project']}
        title="Create project"
        subtitle="3 steps. Identity · Positions + Milestones · Activation. You can save as draft at any point."
      />
      <div className="page-body" style={{maxWidth:980, margin:'0 auto', width:'100%'}}>
        {/* Stepper */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, marginBottom:24, background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', overflow:'hidden'}}>
          {[
            { n:1, title:'Identity',                 state:'done' },
            { n:2, title:'Positions & Milestones',   state:'current' },
            { n:3, title:'Activation',               state:'todo' },
          ].map((s, i, arr) => (
            <div key={s.n} style={{
              padding:'14px 18px',
              borderRight: i < arr.length-1 ? '1px solid var(--color-border)' : 0,
              borderBottom: '3px solid ' + (s.state === 'current' ? 'var(--color-accent)' : 'transparent'),
              background: s.state === 'current' ? 'var(--color-surface)' : s.state === 'done' ? 'var(--color-surface-alt)' : 'var(--color-surface)',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{
                width:24, height:24, borderRadius:'50%',
                background: s.state === 'done' ? 'var(--color-status-active)' : s.state === 'current' ? 'var(--color-accent)' : 'var(--color-border-strong)',
                color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:600,
              }}>{s.state === 'done' ? <Icon name="check" size={12}/> : s.n}</span>
              <div>
                <div className="label-eyebrow">Step {s.n}</div>
                <div className="body-sm" style={{fontWeight:600, marginTop:1}}>{s.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Step 2 active — Positions + Milestones */}
        <div className="card">
          <div className="card-header" style={{flexDirection:'column', alignItems:'flex-start', gap:6}}>
            <h3 style={{fontSize:'var(--font-size-h2)'}}>Positions & Milestones</h3>
            <span className="compact muted">Define the shape of the delivery team and the schedule it commits to. You can edit both after activation.</span>
          </div>
          <div className="card-body" style={{display:'flex', flexDirection:'column', gap:24}}>
            {/* Template chip */}
            <div>
              <div className="label-eyebrow" style={{marginBottom:8}}>Start from template</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                <span className="chip chip-active">Core banking · 14 positions · 6 milestones</span>
                <span className="chip">CRM rollout</span>
                <span className="chip">Data migration</span>
                <span className="chip">Risk &amp; compliance</span>
                <span className="chip">Blank</span>
              </div>
            </div>

            {/* Positions */}
            <div>
              <div style={{display:'flex', alignItems:'center', marginBottom:8}}>
                <div className="label-eyebrow">Positions</div>
                <span style={{flex:1}}/>
                <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Position</button>
              </div>
              <table className="table table-compact" style={{border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)'}}>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Skills</th>
                    <th className="right">Alloc</th>
                    <th>Start</th>
                    <th className="right">Weeks</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role:'Project Manager',         skills:'PRINCE2 · Banking', alloc:80,  start:'Week 1', weeks:60 },
                    { role:'Solution Architect',      skills:'EA · Cloud',        alloc:60,  start:'Week 1', weeks:40 },
                    { role:'Lead Backend Engineer',   skills:'Java · Kafka',      alloc:100, start:'Week 4', weeks:32 },
                    { role:'Senior Frontend Eng',     skills:'React · TS',        alloc:80,  start:'Week 4', weeks:28 },
                    { role:'Mainframe Integration',   skills:'COBOL · MQ',        alloc:60,  start:'Week 8', weeks:24 },
                    { role:'QA Lead',                 skills:'SDET',              alloc:100, start:'Week 4', weeks:28 },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td><span className="table-cell-strong">{r.role}</span></td>
                      <td className="compact muted">{r.skills}</td>
                      <td className="right num">{r.alloc}%</td>
                      <td className="mono compact">{r.start}</td>
                      <td className="right num">{r.weeks}</td>
                      <td><button className="icon-btn icon-btn-sm" aria-label="Edit"><Icon name="edit"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Milestones */}
            <div>
              <div style={{display:'flex', alignItems:'center', marginBottom:8}}>
                <div className="label-eyebrow">Milestones</div>
                <span style={{flex:1}}/>
                <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Milestone</button>
              </div>
              <div className="card" style={{boxShadow:'none', padding:16}}>
                {[
                  { label:'Gate 1 · Discovery sign-off',  start:0,  end:8,  weight:10 },
                  { label:'Gate 2 · Architecture sign-off',start:6, end:18, weight:15 },
                  { label:'Gate 3 · Regulatory approval', start:14, end:26, weight:20 },
                  { label:'Gate 4 · Integration done',    start:20, end:42, weight:25 },
                  { label:'Gate 5 · UAT complete',        start:38, end:54, weight:20 },
                  { label:'Gate 6 · Go-live',             start:52, end:60, weight:10 },
                ].map((g, i) => (
                  <GanttRow key={i} label={g.label} start={g.start} end={g.end} total={60}/>
                ))}
                <div style={{display:'flex', gap:24, marginTop:12, fontSize:'var(--font-size-compact)', color:'var(--color-text-muted)'}}>
                  <span>Total weeks: <strong style={{color:'var(--color-text)'}}>60</strong></span>
                  <span>Weight total: <strong style={{color:'var(--color-text)'}}>100</strong></span>
                  <span>Estimated start: <span className="mono" style={{color:'var(--color-text)'}}>Jul 2026</span></span>
                </div>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}><Icon name="chevron-left"/> Back</button>
            <button className="btn btn-secondary btn-md">Save draft</button>
            <button className="btn btn-primary btn-md">Continue · Activation <Icon name="chevron-right"/></button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AuthForm — login + 2FA preview side-by-side
// ─────────────────────────────────────────────────────────────────────────
function AuthForm() {
  return (
    <div style={{minHeight:'100%', background:'var(--color-bg)', display:'grid', gridTemplateColumns:'1fr 1fr'}}>
      {/* Hero side */}
      <div style={{
        background:'var(--color-accent)',
        color:'#fff',
        padding:'56px 48px',
        display:'flex', flexDirection:'column', gap:32,
        position:'relative', overflow:'hidden',
      }}>
        {/* Subtle gridlines as illustration — no logo bar, no parallax, no marquee */}
        <svg style={{position:'absolute', inset:0, opacity:0.06}} preserveAspectRatio="none" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>

        <div style={{display:'flex', alignItems:'center', gap:10, fontWeight:600, fontSize:16, position:'relative'}}>
          <span style={{width:28, height:28, borderRadius:6, background:'#fff', color:'var(--color-accent)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontWeight:700}}>D</span>
          DeliverIT
        </div>

        <div style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', maxWidth:480, position:'relative'}}>
          <div className="label-eyebrow" style={{color:'rgba(255,255,255,0.7)'}}>Bank Bigfoot · DeliverIT 12.3</div>
          <h1 style={{fontSize:'clamp(32px, 3vw, 44px)', lineHeight:1.1, letterSpacing:'-0.02em', fontWeight:600, margin:'12px 0 0'}}>
            Workforce supply, demand, and delivery — in one place.
          </h1>
          <p style={{color:'rgba(255,255,255,0.78)', fontSize:16, lineHeight:1.5, marginTop:18}}>
            Project Positions, Bench, EVM and approvals stay in sync. Every number is a doorway.
          </p>

          {/* Stat grid as illustration */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:36}}>
            {[
              { label:'Projects',    val:'24'   },
              { label:'People',      val:'186'  },
              { label:'Open positions', val:'18' },
            ].map((s) => (
              <div key={s.label} style={{borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:10}}>
                <div style={{fontSize:28, fontWeight:600, letterSpacing:'-0.01em', fontVariantNumeric:'tabular-nums'}}>{s.val}</div>
                <div style={{color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex', gap:16, color:'rgba(255,255,255,0.6)', fontSize:12, position:'relative'}}>
          <span>v12.3.4 · UK-South</span>
          <span style={{marginLeft:'auto'}}>WCAG 2.2 AA</span>
        </div>
      </div>

      {/* Form side */}
      <div style={{padding:'56px 48px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
        <div style={{maxWidth:380, width:'100%', margin:'0 auto'}}>
          <h2 className="h1" style={{marginBottom:8}}>Sign in</h2>
          <p className="body muted" style={{marginBottom:24}}>Use your bank SSO or your DeliverIT credentials.</p>

          <button className="btn btn-secondary btn-lg" style={{width:'100%', marginBottom:14}}>
            <Icon name="m365" size={16}/> Continue with Bank SSO (Microsoft)
          </button>
          <div style={{display:'flex', alignItems:'center', gap:12, margin:'14px 0'}}>
            <div style={{flex:1, height:1, background:'var(--color-border)'}}/>
            <span className="compact-sm muted">or with credentials</span>
            <div style={{flex:1, height:1, background:'var(--color-border)'}}/>
          </div>

          <div className="field" style={{marginBottom:14}}>
            <label className="field-label">Email</label>
            <input className="input input-lg" placeholder="you@bankbigfoot.co.uk"/>
          </div>
          <div className="field" style={{marginBottom:6}}>
            <label className="field-label">
              Password
              <span style={{marginLeft:'auto'}}><a href="#" className="compact">Forgot password</a></span>
            </label>
            <input className="input input-lg" type="password" placeholder="••••••••••••"/>
          </div>
          <label style={{display:'flex', alignItems:'center', gap:8, marginTop:14, marginBottom:18}}>
            <input type="checkbox" className="checkbox"/>
            <span className="body-sm">Remember this device for 30 days</span>
          </label>
          <button className="btn btn-primary btn-lg" style={{width:'100%'}}>Sign in <Icon name="arrow-right"/></button>

          <p className="compact-sm muted" style={{marginTop:18, textAlign:'center'}}>
            By signing in you accept the <a href="#">Acceptable Use Policy</a> and your activity is audited.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PositionDetail — one position aggregate
// ─────────────────────────────────────────────────────────────────────────
function PositionDetail() {
  return (
    <AppShell active="projects" context="Position · MCB-UK · Senior Frontend Eng">
      <PageHeader
        breadcrumb={['Projects', 'Mercury Core Banking — UK', 'Plan', 'Senior Frontend Eng']}
        title="Senior Frontend Eng"
        badges={<>
          <StatusBadge tone="info">Proposed</StatusBadge>
          <span className="badge badge-outline">MCB-UK · Workstream FE</span>
          <span className="badge badge-outline mono">POS-00148</span>
        </>}
        subtitle={<>80% allocation · 28 weeks · open since 8 May 2026 · <span style={{color:'var(--color-status-warning)'}}>SLA breach in 6h</span></>}
        actions={<>
          <button className="btn btn-ghost btn-md"><Icon name="copy"/> Duplicate</button>
          <button className="btn btn-secondary btn-md">Cancel position</button>
          <button className="btn btn-primary btn-md"><Icon name="check"/> Confirm fill</button>
        </>}
      />
      <div className="page-body" style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'flex-start'}}>
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* Current fill */}
          <div className="card section-card-emphasized">
            <div className="card-header"><h3>Current fill — proposed</h3><StatusBadge tone="info">Awaiting PM confirmation</StatusBadge></div>
            <div className="card-body" style={{display:'grid', gridTemplateColumns:'auto 1fr auto', gap:16, alignItems:'center'}}>
              <Avatar name="Priya Natarajan" size="xl"/>
              <div>
                <div className="h3">Priya Natarajan</div>
                <div className="compact muted" style={{marginTop:2}}>L5 · Senior Frontend Eng · proposed by Maya Kovács</div>
                <div style={{display:'flex', gap:18, marginTop:10}}>
                  <div><div className="label-eyebrow">Match</div><div className="mono" style={{fontWeight:600, fontSize:16}}>92%</div></div>
                  <div><div className="label-eyebrow">Cost</div><div className="mono" style={{fontWeight:600, fontSize:16}}>On rate card</div></div>
                  <div><div className="label-eyebrow">Available</div><div className="mono" style={{fontWeight:600, fontSize:16}}>16 Jun</div></div>
                  <div><div className="label-eyebrow">Conflict</div><div className="mono" style={{fontWeight:600, fontSize:16, color:'var(--color-status-active)'}}>None</div></div>
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <button className="btn btn-primary btn-md">Confirm · Book</button>
                <button className="btn btn-secondary btn-md">View profile</button>
                <button className="btn btn-ghost btn-md">Reject</button>
              </div>
            </div>
          </div>

          {/* Position spec */}
          <div className="card">
            <div className="card-header"><h3>Position spec</h3><button className="btn btn-ghost btn-sm"><Icon name="edit"/> Edit</button></div>
            <div className="card-body" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
              <dl className="dl">
                <dt>Role</dt>           <dd>Senior Frontend Engineer · L5</dd>
                <dt>Workstream</dt>     <dd>FE Customer Channel</dd>
                <dt>Allocation</dt>     <dd>80%</dd>
                <dt>Start</dt>          <dd className="mono">16 Jun 2026</dd>
                <dt>Duration</dt>       <dd>28 weeks</dd>
              </dl>
              <dl className="dl">
                <dt>Skills required</dt><dd>React, TypeScript, Design Systems, D3</dd>
                <dt>Skills nice-to-have</dt><dd>Banking domain, A11y</dd>
                <dt>Rate band</dt>     <dd>L5 · $140–$170/d</dd>
                <dt>Office</dt>        <dd>London or remote (UK)</dd>
                <dt>Security clearance</dt><dd>BPSS</dd>
              </dl>
            </div>
          </div>

          {/* Candidates panel */}
          <div className="card">
            <div className="card-header"><h3>Other candidates considered</h3><span className="compact muted">3 candidates · auto-suggested by skill match</span></div>
            <div style={{overflow:'auto'}}>
              <table className="table table-compact">
                <thead>
                  <tr><th>Candidate</th><th className="right">Match</th><th>Available</th><th>Cost</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {[
                    { name:'Priya Natarajan', match:92, avail:'16 Jun', cost:'On rate card', status:'proposed' },
                    { name:'Diego Costa',     match:84, avail:'01 Jul', cost:'On rate card', status:'considered' },
                    { name:'Saoirse Walsh',   match:79, avail:'23 Jun', cost:'+6% above',    status:'considered' },
                    { name:'Akira Tanaka',    match:72, avail:'04 Aug', cost:'On rate card', status:'declined' },
                  ].map((c, i) => (
                    <tr key={c.name}>
                      <td><span style={{display:'inline-flex', alignItems:'center', gap:8}}><Avatar name={c.name} size="sm"/>{c.name}</span></td>
                      <td className="right mono">{c.match}%</td>
                      <td className="mono">{c.avail}</td>
                      <td>{c.cost}</td>
                      <td>
                        {c.status === 'proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                        {c.status === 'considered' && <StatusBadge tone="pending">Considered</StatusBadge>}
                        {c.status === 'declined' && <StatusBadge tone="danger">Declined</StatusBadge>}
                      </td>
                      <td><button className="btn btn-ghost btn-sm">Compare</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="card-header"><h3>Fill history</h3></div>
            <div className="card-body">
              <div className="timeline">
                {[
                  { tone:'info',   when:'today 09:14', body:<>Maya Kovács proposed <strong>Priya Natarajan</strong></> },
                  { tone:'pending',when:'19 May',       body:<>Position re-opened by PM after Aarav Mehta withdrew</> },
                  { tone:'pending',when:'15 May',       body:<>Aarav Mehta declined offer (commitment elsewhere)</> },
                  { tone:'active', when:'12 May',       body:<>Aarav Mehta proposed by Resource Manager</> },
                  { tone:'pending',when:'08 May',       body:<>Position opened by Ethan Brooks · SLA 14d</> },
                ].map((t, i) => (
                  <div key={i} className={'tl-row tl-'+t.tone}>
                    <span className="tl-dot"/>
                    <div className="tl-body">{t.body}</div>
                    <span className="tl-meta">{t.when}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div style={{display:'flex', flexDirection:'column', gap:16, alignSelf:'stretch'}}>
          <div className="card">
            <div className="card-header"><h3>SLA</h3></div>
            <div className="card-body">
              <div className="mono" style={{fontSize:32, fontWeight:600, color:'var(--color-status-warning)'}}>6h</div>
              <div className="compact muted">until breach · opened 15d ago</div>
              <div style={{height:6, background:'var(--color-surface-alt)', borderRadius:3, marginTop:14, overflow:'hidden'}}>
                <div style={{width:'92%', height:'100%', background:'var(--color-status-warning)', borderRadius:3}}/>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Approval chain</h3></div>
            <div className="card-body" style={{padding:'12px 20px'}}>
              <div className="timeline">
                <div className="tl-row tl-active">
                  <span className="tl-dot"/>
                  <div className="tl-body"><strong>Maya K.</strong> · proposed candidate <span className="compact-sm muted">today</span></div>
                </div>
                <div className="tl-row tl-warning">
                  <span className="tl-dot"/>
                  <div className="tl-body"><strong>Ethan B.</strong> · PM confirmation <span className="compact-sm muted">pending · 6h SLA</span></div>
                </div>
                <div className="tl-row">
                  <span className="tl-dot"/>
                  <div className="tl-body"><strong>Director</strong> · only if rate over band <span className="compact-sm muted">conditional</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Linked</h3></div>
            <div className="card-body" style={{padding:12, display:'flex', flexDirection:'column', gap:6}}>
              <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-control)', color:'var(--color-text)'}}>
                <Icon name="projects" style={{color:'var(--color-text-muted)'}}/> Mercury Core Banking — UK
              </a>
              <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-control)', color:'var(--color-text)'}}>
                <Icon name="jira" style={{color:'var(--color-text-muted)'}}/> MCB-FE board
              </a>
              <a href="#" style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:'var(--radius-control)', color:'var(--color-text)'}}>
                <Icon name="confluence" style={{color:'var(--color-text-muted)'}}/> FE Customer Channel space
              </a>
            </div>
          </div>
          <div className="card" style={{flex:1, minHeight:140}}>
            <div className="card-header"><h3>Quick keys</h3></div>
            <div className="card-body" style={{padding:'10px 20px', display:'flex', flexDirection:'column', gap:8}}>
              {[
                { k:'C', l:'Confirm fill' },
                { k:'R', l:'Reject candidate' },
                { k:'E', l:'Edit spec' },
                { k:'/', l:'Find candidate' },
                { k:'⌘K', l:'Command palette' },
              ].map((s) => (
                <div key={s.k} style={{display:'flex', alignItems:'center', gap:8}}>
                  <span className="kbd">{s.k}</span>
                  <span className="body-sm muted">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

window.CreateProjectWizard = CreateProjectWizard;
window.AuthForm = AuthForm;
window.PositionDetail = PositionDetail;
