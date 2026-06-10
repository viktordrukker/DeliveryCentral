// ds-components.jsx — Atoms, Molecules, Surfaces, Data primitives, State primitives.

// Generic "spec section" — title + variants grid
function Spec({ title, subtitle, children, cols = 2 }) {
  return (
    <div className="card" style={{marginBottom:20}}>
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <div className="compact muted" style={{marginTop:4}}>{subtitle}</div>}
        </div>
      </div>
      <div className="card-body" style={{display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:24}}>{children}</div>
    </div>
  );
}
function SpecCell({ label, children }) {
  return (
    <div>
      <div className="label-eyebrow" style={{marginBottom:10}}>{label}</div>
      <div style={{display:'flex', flexDirection:'column', gap:10, alignItems:'flex-start'}}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// AtomsView
// ─────────────────────────────────────────────────────────────────────────
function AtomsView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">DeliverIT · Atoms</div>
        <h1 className="h1" style={{marginTop:6}}>Buttons, inputs, badges, avatars, kbd</h1>
        <p className="body muted" style={{maxWidth:680}}>One file, no design tropes. Every interactive surface meets WCAG 2.2 AA contrast and announces state via aria.</p>
      </div>

      <Spec title="Button · variants × sizes" subtitle="primary · secondary · tertiary · ghost · danger" cols={5}>
        {['primary','secondary','tertiary','ghost','danger'].map((v) => (
          <SpecCell key={v} label={v}>
            <button className={`btn btn-${v} btn-lg`}><Icon name="plus"/> Add position</button>
            <button className={`btn btn-${v} btn-md`}><Icon name="plus"/> Add position</button>
            <button className={`btn btn-${v} btn-sm`}>Add position</button>
            <button className={`btn btn-${v} btn-md btn-loading`}>Loading</button>
            <button className={`btn btn-${v} btn-md`} disabled>Disabled</button>
          </SpecCell>
        ))}
      </Spec>

      <Spec title="IconButton · sizes & states" cols={4}>
        <SpecCell label="default">
          <button className="icon-btn" aria-label="Edit"><Icon name="edit"/></button>
          <button className="icon-btn" aria-label="Delete"><Icon name="trash"/></button>
          <button className="icon-btn" aria-label="More"><Icon name="more-v"/></button>
        </SpecCell>
        <SpecCell label="bordered">
          <button className="icon-btn icon-btn-bordered" aria-label="Edit"><Icon name="edit"/></button>
          <button className="icon-btn icon-btn-bordered" aria-label="Refresh"><Icon name="refresh"/></button>
          <button className="icon-btn icon-btn-bordered" aria-label="Download"><Icon name="download"/></button>
        </SpecCell>
        <SpecCell label="sizes">
          <button className="icon-btn icon-btn-sm" aria-label="Close"><Icon name="x"/></button>
          <button className="icon-btn" aria-label="Edit"><Icon name="edit"/></button>
          <button className="icon-btn icon-btn-lg" aria-label="Help"><Icon name="info"/></button>
        </SpecCell>
        <SpecCell label="disabled">
          <button className="icon-btn" disabled aria-label="Edit"><Icon name="edit"/></button>
        </SpecCell>
      </Spec>

      <Spec title="Input · text · email · password · number · search · date · with affix" cols={2}>
        <SpecCell label="text · default / focus / invalid">
          <input className="input" placeholder="Default" defaultValue="Mercury Core Banking"/>
          <input className="input" placeholder="Focused" defaultValue="Mercury Core Banking" autoFocus/>
          <input className="input" placeholder="Error" defaultValue="bad@email" aria-invalid="true"/>
          <input className="input" placeholder="Disabled" disabled defaultValue="Locked field"/>
        </SpecCell>
        <SpecCell label="size variants">
          <input className="input input-sm" placeholder="Small · 28px"/>
          <input className="input" placeholder="Default · 32px"/>
          <input className="input input-lg" placeholder="Large · 40px"/>
        </SpecCell>
        <SpecCell label="affix · currency / unit">
          <div className="input-affix"><span className="affix">USD</span><input className="input" defaultValue="184,000" type="text"/></div>
          <div className="input-affix"><input className="input" defaultValue="80" type="number"/><span className="affix affix-right">%</span></div>
          <div className="input-affix"><span className="affix"><Icon name="search"/></span><input className="input" placeholder="Search name, project…"/></div>
        </SpecCell>
        <SpecCell label="select · native">
          <select className="select" defaultValue="open"><option value="draft">Draft</option><option value="open">Open</option><option value="proposed">Proposed</option><option value="booked">Booked</option></select>
          <select className="select"><option>All projects (24)</option><option>My projects (6)</option><option>At risk (2)</option></select>
        </SpecCell>
        <SpecCell label="textarea">
          <textarea className="textarea" rows="3" placeholder="Comment, justification, change description…" defaultValue="Approve re-baseline. Trigger fortnightly variance review until end of Q3."/>
        </SpecCell>
        <SpecCell label="combobox · searchable">
          <div style={{position:'relative', width:'100%'}}>
            <input className="input" defaultValue="React"/>
            <div style={{
              position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:2,
              background:'var(--color-surface-raised)', border:'1px solid var(--color-border)',
              borderRadius:'var(--radius-card)', boxShadow:'var(--shadow-dropdown)', padding:4,
            }}>
              {['React','React Native','React Router','Redux','React Query'].map((s, i) => (
                <div key={s} style={{padding:'6px 8px', borderRadius:4, background: i === 0 ? 'var(--color-accent-soft)' : 'transparent', display:'flex', justifyContent:'space-between'}}>
                  <span className="body-sm">{s}</span>
                  {i === 0 && <Icon name="check" size={12} style={{color:'var(--color-accent)'}}/>}
                </div>
              ))}
            </div>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Checkbox · Radio · Switch" cols={3}>
        <SpecCell label="checkbox">
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="checkbox" className="checkbox" defaultChecked/> <span className="body-sm">Mark as approved</span></label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="checkbox" className="checkbox"/> <span className="body-sm">Notify Teams channel</span></label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="checkbox" className="checkbox" disabled/> <span className="body-sm muted">Auto-close position (disabled)</span></label>
        </SpecCell>
        <SpecCell label="radio">
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="radio" name="r" className="radio" defaultChecked/> <span className="body-sm">Approve & continue</span></label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="radio" name="r" className="radio"/> <span className="body-sm">Approve & end queue</span></label>
          <label style={{display:'flex', gap:8, alignItems:'center'}}><input type="radio" name="r" className="radio"/> <span className="body-sm">Hold for sign-off</span></label>
        </SpecCell>
        <SpecCell label="switch">
          <label style={{display:'flex', gap:10, alignItems:'center'}}><input type="checkbox" className="switch" defaultChecked/><span className="body-sm">Tabular numbers everywhere</span></label>
          <label style={{display:'flex', gap:10, alignItems:'center'}}><input type="checkbox" className="switch"/><span className="body-sm">Compact density</span></label>
          <label style={{display:'flex', gap:10, alignItems:'center'}}><input type="checkbox" className="switch" defaultChecked/><span className="body-sm">Color-blind RAG swap</span></label>
        </SpecCell>
      </Spec>

      <Spec title="Badge · status semantics (FIXED)" subtitle="green=healthy, amber=warning, red=danger, dark red=critical, grey=pending, cyan=info" cols={2}>
        <SpecCell label="tones">
          <StatusBadge tone="active">Healthy</StatusBadge>
          <StatusBadge tone="warning">Warning</StatusBadge>
          <StatusBadge tone="danger">Danger</StatusBadge>
          <StatusBadge tone="critical">Critical</StatusBadge>
          <StatusBadge tone="info">Info</StatusBadge>
          <StatusBadge tone="pending">Pending</StatusBadge>
          <StatusBadge tone="accent">Booked</StatusBadge>
          <span className="badge badge-outline">Outline</span>
        </SpecCell>
        <SpecCell label="domain examples">
          <StatusBadge tone="active">Assigned · 100%</StatusBadge>
          <StatusBadge tone="warning">Open · 14d SLA</StatusBadge>
          <StatusBadge tone="danger">Over budget · −8%</StatusBadge>
          <StatusBadge tone="critical">P0 incident</StatusBadge>
          <StatusBadge tone="info">Proposed</StatusBadge>
          <StatusBadge tone="pending">Draft</StatusBadge>
          <span className="badge badge-outline mono">MCB-UK</span>
        </SpecCell>
      </Spec>

      <Spec title="Chip · filter & multi-select" cols={2}>
        <SpecCell label="filter chips">
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            <span className="chip chip-active">Engineering <Icon name="x" size={10} className="remove"/></span>
            <span className="chip chip-active">L4 + <Icon name="x" size={10} className="remove"/></span>
            <span className="chip">London</span>
            <span className="chip">Available now</span>
            <span className="chip">Remote OK</span>
          </div>
        </SpecCell>
        <SpecCell label="skill chips">
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {['React','TypeScript','D3','Storybook','GraphQL','Figma'].map((s) => <span key={s} className="chip" style={{cursor:'default'}}>{s}</span>)}
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Avatar · stack · sizes" cols={3}>
        <SpecCell label="sizes">
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <Avatar name="Priya Natarajan" size="sm"/>
            <Avatar name="Ethan Brooks"/>
            <Avatar name="Maya Kovács" size="lg"/>
            <Avatar name="Henrik Voss" size="xl"/>
          </div>
        </SpecCell>
        <SpecCell label="hue determinism">
          <div style={{display:'flex', gap:4}}>
            {['Aarav Mehta','Priya Natarajan','Marco Bianchi','Lina Olsen','Tomás Reyes','Hannah Cole','Yusuf Demir','Sofia Andersen'].map((n) => <Avatar key={n} name={n}/>)}
          </div>
        </SpecCell>
        <SpecCell label="stack · +N overflow">
          <div className="avatar-stack">
            <Avatar name="Priya Natarajan"/>
            <Avatar name="Ethan Brooks"/>
            <Avatar name="Maya Kovács"/>
            <Avatar name="Henrik Voss"/>
            <span className="avatar" style={{background:'var(--color-surface-alt)', color:'var(--color-text-muted)', marginLeft:-8, boxShadow:'0 0 0 2px var(--color-surface)'}}>+6</span>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Kbd · keyboard hint" cols={2}>
        <SpecCell label="single keys">
          <div style={{display:'flex', gap:6}}>
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
            <span style={{alignSelf:'center'}} className="compact muted">Open command palette</span>
          </div>
          <div style={{display:'flex', gap:6}}>
            <span className="kbd">G</span>
            <span style={{alignSelf:'center'}} className="compact muted">then</span>
            <span className="kbd">P</span>
            <span style={{alignSelf:'center'}} className="compact muted">Go to Projects</span>
          </div>
        </SpecCell>
        <SpecCell label="in-app shortcut chips">
          <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
            <span className="kbd">A</span><span className="compact muted">Approve</span>
            <span style={{margin:'0 4px'}}>·</span>
            <span className="kbd">R</span><span className="compact muted">Reject</span>
            <span style={{margin:'0 4px'}}>·</span>
            <span className="kbd">J</span><span className="kbd">K</span><span className="compact muted">Next/prev</span>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Spinner · Skeleton" cols={2}>
        <SpecCell label="spinner">
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <span className="spinner"/>
            <span className="spinner" style={{width:24, height:24, borderWidth:3}}/>
            <button className="btn btn-secondary btn-md"><span className="spinner" style={{width:12, height:12, borderWidth:2}}/> Saving…</button>
          </div>
        </SpecCell>
        <SpecCell label="skeleton">
          <div style={{width:'100%', display:'flex', flexDirection:'column', gap:6}}>
            <div className="skel" style={{width:'70%', height:14}}/>
            <div className="skel" style={{width:'92%', height:10}}/>
            <div className="skel" style={{width:'48%', height:10}}/>
          </div>
        </SpecCell>
      </Spec>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MoleculesView
// ─────────────────────────────────────────────────────────────────────────
function MoleculesView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">DeliverIT · Molecules</div>
        <h1 className="h1" style={{marginTop:6}}>Form fields, search, filters, pagination, tabs</h1>
      </div>

      <Spec title="FormField · label + hint + error" cols={2}>
        <SpecCell label="default">
          <div className="field" style={{width:300}}>
            <label className="field-label">Project name <span className="req">*</span></label>
            <input className="input" defaultValue="Mercury Core Banking — UK"/>
            <div className="field-hint">Visible to all platform roles. Cannot be changed after activation.</div>
          </div>
        </SpecCell>
        <SpecCell label="with error">
          <div className="field" style={{width:300}}>
            <label className="field-label">Project code <span className="req">*</span></label>
            <input className="input" defaultValue="mcb-uk" aria-invalid="true"/>
            <div className="field-error"><Icon name="alert" size={12} style={{verticalAlign:'-2px'}}/> Must be uppercase A–Z, 3–8 chars.</div>
          </div>
        </SpecCell>
        <SpecCell label="inline grid">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, width:'100%'}}>
            <div className="field">
              <label className="field-label">Allocation</label>
              <div className="input-affix"><input className="input" defaultValue="80" type="number"/><span className="affix affix-right">%</span></div>
            </div>
            <div className="field">
              <label className="field-label">Duration</label>
              <div className="input-affix"><input className="input" defaultValue="28" type="number"/><span className="affix affix-right">weeks</span></div>
            </div>
          </div>
        </SpecCell>
        <SpecCell label="numeric · currency · locale">
          <div className="field" style={{width:300}}>
            <label className="field-label">Budget · base currency</label>
            <div className="input-affix"><span className="affix">USD</span><input className="input" defaultValue="2,240,000" type="text"/></div>
            <div className="field-hint">Will be consolidated against tenant FX rate at month-end close.</div>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="FilterBar · with chips + sort" cols={1}>
        <SpecCell label="active state">
          <div className="filter-bar" style={{width:'100%'}}>
            <div style={{position:'relative', width:260}}>
              <Icon name="search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-subtle)'}}/>
              <input className="input input-sm" placeholder="Search…" style={{paddingLeft:30}}/>
            </div>
            <span className="chip chip-active">Engineering <Icon name="x" size={10} className="remove"/></span>
            <span className="chip chip-active">L4 + <Icon name="x" size={10} className="remove"/></span>
            <span className="chip">London</span>
            <button className="btn btn-ghost btn-sm"><Icon name="plus"/> Filter</button>
            <div style={{flex:1}}/>
            <button className="btn btn-ghost btn-sm"><Icon name="download"/> Export</button>
            <select className="select input-sm" style={{width:140}}><option>Most recent</option><option>Longest idle</option></select>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Pagination · Breadcrumb · Tabs" cols={3}>
        <SpecCell label="pagination">
          <div className="pagination">
            <button className="pag-btn" disabled><Icon name="chevron-left" size={12}/></button>
            <button className="pag-btn">1</button>
            <button className="pag-btn active">2</button>
            <button className="pag-btn">3</button>
            <button className="pag-btn">4</button>
            <span className="pag-btn" style={{cursor:'default'}}>…</span>
            <button className="pag-btn">12</button>
            <button className="pag-btn"><Icon name="chevron-right" size={12}/></button>
          </div>
          <span className="compact muted">Showing 26–50 of 287</span>
        </SpecCell>
        <SpecCell label="breadcrumb">
          <div className="breadcrumb">
            <a href="#">Projects</a>
            <span className="sep"><Icon name="chevron-right" size={12}/></span>
            <a href="#">Mercury Core Banking</a>
            <span className="sep"><Icon name="chevron-right" size={12}/></span>
            <span className="current">Plan</span>
          </div>
          <div className="breadcrumb">
            <a href="#">People</a>
            <span className="sep"><Icon name="chevron-right" size={12}/></span>
            <a href="#">Directory</a>
            <span className="sep"><Icon name="chevron-right" size={12}/></span>
            <span className="current">Priya Natarajan</span>
          </div>
        </SpecCell>
        <SpecCell label="tabs">
          <div className="tabs" style={{width:'100%'}}>
            <div className="tab active">Pulse</div>
            <div className="tab">Plan <span className="count">8</span></div>
            <div className="tab">Money</div>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Toast stack · feedback after action" cols={1}>
        <SpecCell label="examples">
          <div style={{display:'flex', flexDirection:'column', gap:10, width:'100%', maxWidth:520}}>
            {[
              { tone:'active',  title:'Position confirmed', body:'Priya Natarajan booked on Mercury Core Banking — UK', action:'View assignment' },
              { tone:'warning', title:'Saved as draft',     body:'You have 1 unsaved change. Continue editing?',      action:'Continue' },
              { tone:'danger',  title:'Approval failed',    body:'Network error · 503. Retry in a moment.',           action:'Retry' },
            ].map((t, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px',
                background:'var(--color-surface-raised)',
                border:'1px solid var(--color-border)',
                borderLeft: '3px solid ' + (t.tone === 'active' ? 'var(--color-status-active)' : t.tone === 'warning' ? 'var(--color-status-warning)' : 'var(--color-status-danger)'),
                borderRadius:'var(--radius-card)',
                boxShadow:'var(--shadow-dropdown)',
              }}>
                <Icon name={t.tone === 'active' ? 'check-circle' : t.tone === 'warning' ? 'alert' : 'x-circle'} size={18} style={{color:`var(--color-status-${t.tone === 'active' ? 'active' : t.tone})`}}/>
                <div style={{flex:1}}>
                  <div className="body-sm" style={{fontWeight:600}}>{t.title}</div>
                  <div className="compact muted">{t.body}</div>
                </div>
                <button className="btn btn-ghost btn-sm">{t.action}</button>
                <button className="icon-btn icon-btn-sm" aria-label="Dismiss"><Icon name="x"/></button>
              </div>
            ))}
          </div>
        </SpecCell>
      </Spec>

      <Spec title="DatePicker · DateRangePicker · inline preview" cols={2}>
        <SpecCell label="date input">
          <input type="text" className="input mono" defaultValue="16 Jun 2026" style={{width:160}}/>
          <div style={{
            width:240, padding:12,
            background:'var(--color-surface-raised)', border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-card)', boxShadow:'var(--shadow-dropdown)',
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <button className="icon-btn icon-btn-sm" aria-label="Prev"><Icon name="chevron-left"/></button>
              <span className="body-sm" style={{fontWeight:600}}>June 2026</span>
              <button className="icon-btn icon-btn-sm" aria-label="Next"><Icon name="chevron-right"/></button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, textAlign:'center'}}>
              {['M','T1','W','T2','F','S1','S2'].map((d) => <span key={d} className="compact-sm muted" style={{padding:'4px 0'}}>{d[0]}</span>)}
              {Array.from({length:30}, (_, i) => i+1).map((d) => (
                <span key={d} style={{
                  padding:'6px 0',
                  borderRadius:4,
                  fontSize:12,
                  fontVariantNumeric:'tabular-nums',
                  background: d === 16 ? 'var(--color-accent)' : 'transparent',
                  color: d === 16 ? '#fff' : 'var(--color-text)',
                  cursor:'pointer',
                }}>{d}</span>
              ))}
            </div>
          </div>
        </SpecCell>
        <SpecCell label="range">
          <div className="input-affix" style={{maxWidth:300}}>
            <span className="affix"><Icon name="calendar"/></span>
            <input className="input mono" defaultValue="16 Jun – 30 Dec 2026" style={{flex:1}}/>
          </div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            <span className="chip">Today</span>
            <span className="chip">This week</span>
            <span className="chip chip-active">This quarter</span>
            <span className="chip">YTD</span>
            <span className="chip">Custom…</span>
          </div>
        </SpecCell>
      </Spec>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SurfacesView — Modal, Drawer, Popover, ConfirmDialog, FormModal
// ─────────────────────────────────────────────────────────────────────────
function SurfacesView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">DeliverIT · Surfaces</div>
        <h1 className="h1" style={{marginTop:6}}>Modal, Drawer, Popover, ConfirmDialog</h1>
        <p className="body muted">Static previews — overlays shown in-place, not floating, so the spec is readable.</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
        {/* Modal preview */}
        <div className="card">
          <div className="card-header"><h3>Modal · md (520px)</h3><span className="compact muted">overlay 35%, content 4-radius card</span></div>
          <div style={{background:'var(--color-overlay)', padding:24, position:'relative'}}>
            <div className="card" style={{maxWidth:480, margin:'0 auto', boxShadow:'var(--shadow-modal)'}}>
              <div className="card-header"><h3>End assignment · Atlas ERP</h3>
                <button className="icon-btn icon-btn-sm" aria-label="Close"><Icon name="x"/></button>
              </div>
              <div className="card-body">
                <p className="body-sm" style={{marginTop:0}}>This will release <strong>Priya Natarajan</strong> from Atlas ERP Rollout on the effective date below. The position will be marked Open and her status set to Bench.</p>
                <div className="field" style={{marginTop:14}}>
                  <label className="field-label">Effective date</label>
                  <input className="input mono" defaultValue="18 May 2026"/>
                </div>
                <div className="field" style={{marginTop:12}}>
                  <label className="field-label">Reason</label>
                  <select className="select"><option>Project completed</option><option>Re-allocated</option><option>Performance</option><option>Personal</option></select>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}>Cancel</button>
                <button className="btn btn-primary btn-md">Release Priya</button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm dialog */}
        <div className="card">
          <div className="card-header"><h3>ConfirmDialog · danger tone</h3><span className="compact muted">requires typed confirmation for destructive ops</span></div>
          <div style={{background:'var(--color-overlay)', padding:24, position:'relative'}}>
            <div className="card" style={{maxWidth:420, margin:'0 auto', boxShadow:'var(--shadow-modal)'}}>
              <div className="card-body" style={{display:'flex', gap:12}}>
                <div style={{width:36, height:36, borderRadius:8, background:'var(--color-status-danger-bg)', color:'var(--color-status-danger)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <Icon name="alert" size={18}/>
                </div>
                <div>
                  <h3 style={{fontSize:'var(--font-size-h3)'}}>Drop legacy staffing models?</h3>
                  <p className="body-sm muted" style={{marginTop:6}}>
                    This will drop <span className="mono">StaffingRequest, ProjectAssignment, Slate, FillHistory</span> and 7 other tables. The action is logged and irreversible. Backfill must be verified first.
                  </p>
                  <div className="field" style={{marginTop:12}}>
                    <label className="field-label">Type <span className="mono">DROP-STAFFING</span> to confirm</label>
                    <input className="input" defaultValue=""/>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}>Cancel</button>
                <button className="btn btn-danger btn-md" disabled>Drop models</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
        {/* Popover */}
        <div className="card">
          <div className="card-header"><h3>Popover · attached to anchor</h3><span className="compact muted">collision-aware, 8px arrow gap</span></div>
          <div style={{padding:24, position:'relative', display:'flex', justifyContent:'center'}}>
            <div style={{position:'relative'}}>
              <button className="btn btn-secondary btn-md">Position status <Icon name="chevron-down"/></button>
              <div style={{
                position:'absolute', top:'calc(100% + 6px)', left:0,
                width:240, padding:6,
                background:'var(--color-surface-raised)', border:'1px solid var(--color-border)',
                borderRadius:'var(--radius-card)', boxShadow:'var(--shadow-dropdown)',
                zIndex:10,
              }}>
                {[
                  { label:'Draft',      tone:'pending' },
                  { label:'Open',       tone:'warning', active: true },
                  { label:'Proposed',   tone:'info' },
                  { label:'Booked',     tone:'accent' },
                  { label:'Onboarding', tone:'info' },
                  { label:'Assigned',   tone:'active' },
                  { label:'On hold',    tone:'pending' },
                  { label:'Released',   tone:'pending' },
                ].map((o) => (
                  <div key={o.label} style={{
                    padding:'8px 10px', borderRadius:4,
                    background: o.active ? 'var(--color-row-hover)' : 'transparent',
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span className={'tone-dot tone-'+o.tone}/>
                    <span className="body-sm">{o.label}</span>
                    {o.active && <Icon name="check" size={12} style={{marginLeft:'auto', color:'var(--color-accent)'}}/>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drawer */}
        <div className="card">
          <div className="card-header"><h3>Drawer · right · md (480px)</h3><span className="compact muted">stays on context · 250ms slide</span></div>
          <div style={{position:'relative', height:360, overflow:'hidden', background:'var(--color-bg)'}}>
            {/* faux content underneath */}
            <div style={{padding:16, opacity:0.5}}>
              <div className="skel" style={{height:14, marginBottom:8}}/>
              <div className="skel" style={{height:10, width:'80%', marginBottom:8}}/>
              <div className="skel" style={{height:10, width:'60%', marginBottom:24}}/>
              <div className="skel" style={{height:14, marginBottom:8}}/>
              <div className="skel" style={{height:10, width:'70%'}}/>
            </div>
            {/* drawer */}
            <div style={{
              position:'absolute', top:0, right:0, bottom:0, width:340,
              background:'var(--color-surface)', borderLeft:'1px solid var(--color-border)',
              boxShadow:'var(--shadow-modal)',
              display:'flex', flexDirection:'column',
            }}>
              <div className="card-header" style={{borderRadius:0}}>
                <h3>Quick assign · MCB-UK</h3>
                <button className="icon-btn icon-btn-sm" aria-label="Close"><Icon name="x"/></button>
              </div>
              <div className="card-body" style={{flex:1, overflow:'auto'}}>
                <div className="field" style={{marginBottom:12}}>
                  <label className="field-label">Position</label>
                  <select className="select"><option>Senior Frontend Eng · 80%</option></select>
                </div>
                <div className="field" style={{marginBottom:12}}>
                  <label className="field-label">Person</label>
                  <input className="input" defaultValue="Priya Natarajan"/>
                </div>
                <div className="field" style={{marginBottom:12}}>
                  <label className="field-label">Start date</label>
                  <input className="input mono" defaultValue="16 Jun 2026"/>
                </div>
                <div className="banner banner-info" style={{marginTop:14}}>
                  <Icon name="info" style={{color:'var(--color-status-info)'}}/>
                  <div>
                    <div className="banner-title">No conflicts</div>
                    <div className="banner-body">Priya's other assignments end 15 Jun.</div>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button className="btn btn-ghost btn-md" style={{marginRight:'auto'}}>Cancel</button>
                <button className="btn btn-primary btn-md">Propose</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu popover */}
      <Spec title="MenuPopover · keyboard nav" cols={2}>
        <SpecCell label="row actions menu">
          <div style={{
            width:220, padding:6,
            background:'var(--color-surface-raised)', border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-card)', boxShadow:'var(--shadow-dropdown)',
          }}>
            {[
              { icon:'edit',  label:'Edit position',       sc:'E' },
              { icon:'copy',  label:'Duplicate',           sc:'⌘D' },
              { icon:'eye',   label:'View history',        sc:null },
              { icon:'comment',label:'Add comment',        sc:'C' },
            ].map((m, i) => (
              <div key={m.label} style={{
                padding:'7px 10px', borderRadius:4,
                display:'flex', alignItems:'center', gap:10,
                background: i === 0 ? 'var(--color-row-hover)' : 'transparent',
              }}>
                <Icon name={m.icon} size={14} style={{color:'var(--color-text-muted)'}}/>
                <span className="body-sm" style={{flex:1}}>{m.label}</span>
                {m.sc && <span className="kbd">{m.sc}</span>}
              </div>
            ))}
            <div style={{height:1, background:'var(--color-border)', margin:'4px 6px'}}/>
            <div style={{padding:'7px 10px', borderRadius:4, display:'flex', alignItems:'center', gap:10, color:'var(--color-status-danger)'}}>
              <Icon name="trash" size={14}/>
              <span className="body-sm" style={{flex:1}}>Cancel position…</span>
              <span className="kbd">⌫</span>
            </div>
          </div>
        </SpecCell>
        <SpecCell label="user account menu">
          <div style={{
            width:260, padding:6,
            background:'var(--color-surface-raised)', border:'1px solid var(--color-border)',
            borderRadius:'var(--radius-card)', boxShadow:'var(--shadow-dropdown)',
          }}>
            <div style={{padding:'10px 10px 6px', display:'flex', alignItems:'center', gap:10}}>
              <Avatar name="Ethan Brooks" size="lg"/>
              <div style={{minWidth:0}}>
                <div className="body-sm" style={{fontWeight:600}}>Ethan Brooks</div>
                <div className="compact-sm muted" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>ethan.brooks@bankbigfoot.co.uk</div>
              </div>
            </div>
            <div style={{height:1, background:'var(--color-border)', margin:'4px 6px'}}/>
            {[
              { icon:'people', label:'My profile' },
              { icon:'hours',  label:'My timesheet' },
              { icon:'settings', label:'Settings' },
              { icon:'info',   label:'Keyboard shortcuts', sc:'⌘/' },
            ].map((m) => (
              <div key={m.label} style={{padding:'7px 10px', borderRadius:4, display:'flex', alignItems:'center', gap:10}}>
                <Icon name={m.icon} size={14} style={{color:'var(--color-text-muted)'}}/>
                <span className="body-sm" style={{flex:1}}>{m.label}</span>
                {m.sc && <span className="kbd">{m.sc}</span>}
              </div>
            ))}
            <div style={{height:1, background:'var(--color-border)', margin:'4px 6px'}}/>
            <div style={{padding:'7px 10px', borderRadius:4, display:'flex', alignItems:'center', gap:10, color:'var(--color-status-danger)'}}>
              <Icon name="lock" size={14}/>
              <span className="body-sm">Sign out</span>
            </div>
          </div>
        </SpecCell>
      </Spec>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// DataView — KPI, Quadrant, Sparkline, Donut, MiniBar, VarBar, Table
// ─────────────────────────────────────────────────────────────────────────
function DataView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">DeliverIT · Data primitives</div>
        <h1 className="h1" style={{marginTop:6}}>KPI, Quadrant, Sparkline, Donut, MiniBar, VarBar, Table</h1>
      </div>

      <Spec title="KPI card · tone × delta" subtitle="Every KPI is a doorway · accent border-left = threshold" cols={1}>
        <SpecCell label="all tones">
          <div className="kpi-strip" style={{gridTemplateColumns:'repeat(5,1fr)', width:'100%'}}>
            <div className="kpi tone-active"><span className="kpi-label">Healthy</span><span className="kpi-value">88<span className="unit">%</span></span><span className="kpi-delta up"><Icon name="trending-up" size={12}/> +2</span></div>
            <div className="kpi tone-warning"><span className="kpi-label">Warning</span><span className="kpi-value">62<span className="unit">%</span></span><span className="kpi-delta down"><Icon name="trending-down" size={12}/> −4</span></div>
            <div className="kpi tone-danger"><span className="kpi-label">Danger</span><span className="kpi-value">48<span className="unit">%</span></span><span className="kpi-delta down"><Icon name="trending-down" size={12}/> −8</span></div>
            <div className="kpi tone-info"><span className="kpi-label">Info</span><span className="kpi-value">11<span className="unit"> d</span></span><span className="kpi-foot">to next gate</span></div>
            <div className="kpi"><span className="kpi-label">Neutral</span><span className="kpi-value mono">$2.24M</span><Sparkline data={[1.8,2.0,2.1,2.2,2.24]} width={120} height={20}/></div>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Quadrant card · 4-axis RAG" subtitle="Single card answers ‘what state is this project?’ in one glance" cols={1}>
        <SpecCell label="example">
          <div className="quad-grid" style={{width:'100%', maxWidth:520}}>
            <div className="quad tone-warning"><div className="quad-head"><span className="quad-title">Delivery</span><StatusBadge tone="warning">At risk</StatusBadge></div><div className="quad-score">62<span className="out"> / 100</span></div><div className="quad-bar"><i style={{width:'62%'}}/></div></div>
            <div className="quad tone-danger"><div className="quad-head"><span className="quad-title">Budget</span><StatusBadge tone="danger">Over</StatusBadge></div><div className="quad-score">48<span className="out"> / 100</span></div><div className="quad-bar"><i style={{width:'48%'}}/></div></div>
            <div className="quad tone-active"><div className="quad-head"><span className="quad-title">People</span><StatusBadge tone="active">Healthy</StatusBadge></div><div className="quad-score">81<span className="out"> / 100</span></div><div className="quad-bar"><i style={{width:'81%'}}/></div></div>
            <div className="quad tone-active"><div className="quad-head"><span className="quad-title">Quality</span><StatusBadge tone="active">Healthy</StatusBadge></div><div className="quad-score">88<span className="out"> / 100</span></div><div className="quad-bar"><i style={{width:'88%'}}/></div></div>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Sparkline · MiniBar · Donut · VarBar" cols={4}>
        <SpecCell label="sparkline">
          <Sparkline data={[10, 14, 12, 18, 22, 28, 36, 42, 38, 46]} width={140} height={40}/>
          <Sparkline data={[60, 56, 52, 48, 50, 44, 38, 32]} width={140} height={40} tone="danger"/>
          <Sparkline data={[20, 28, 30, 36, 32, 40, 44]} width={140} height={40} tone="active"/>
        </SpecCell>
        <SpecCell label="mini bars">
          <MiniBars data={[12, 18, 22, 28, 26, 32, 38, 40, 44, 38, 42, 46]} width={160} height={42} threshold={36}/>
          <MiniBars data={[60, 80, 50, 70, 100, 90, 110]} width={160} height={42} threshold={90} tone="active"/>
        </SpecCell>
        <SpecCell label="donut">
          <div style={{display:'flex', gap:14, alignItems:'center'}}>
            <Donut value={62} size={72} thickness={10} tone="warning"/>
            <Donut value={88} size={72} thickness={10} tone="active"/>
            <Donut value={34} size={72} thickness={10} tone="danger"/>
          </div>
        </SpecCell>
        <SpecCell label="variance bar">
          <div style={{width:180, display:'flex', flexDirection:'column', gap:6}}>
            <VarianceBar value={-148} max={200}/>
            <VarianceBar value={+44}  max={200}/>
            <VarianceBar value={-52}  max={200}/>
            <VarianceBar value={+12}  max={200}/>
          </div>
        </SpecCell>
      </Spec>

      <Spec title="Description list · spreadsheet-density facts" cols={1}>
        <SpecCell label="example">
          <dl className="dl" style={{width:'100%', maxWidth:520}}>
            <dt>Employee ID</dt>     <dd className="mono">EID-04812</dd>
            <dt>Office</dt>          <dd>London · Canary Wharf</dd>
            <dt>Working pattern</dt> <dd>Full-time · 37.5h/wk</dd>
            <dt>Cost / day</dt>      <dd className="mono">$1,650</dd>
            <dt>Utilization L30D</dt><dd className="mono">86%</dd>
            <dt>Leave balance</dt>   <dd className="mono">14.5 d</dd>
          </dl>
        </SpecCell>
      </Spec>

      <Spec title="Table · default density" cols={1}>
        <SpecCell label="all-features example">
          <div style={{width:'100%', border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', overflow:'hidden'}}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:36}}><input type="checkbox" className="checkbox"/></th>
                  <th>Position</th>
                  <th>Project</th>
                  <th className="right">Alloc</th>
                  <th>Status</th>
                  <th className="right">Cost/d</th>
                  <th style={{width:40}}></th>
                </tr>
              </thead>
              <tbody>
                {[
                  { p:'Senior Frontend Eng', pr:'Mercury Core Banking', alloc:'80%',  status:'proposed', cost:1650 },
                  { p:'Backend Lead',         pr:'Atlas ERP Rollout',    alloc:'100%', status:'assigned', cost:1820 },
                  { p:'COBOL Integration',    pr:'Mercury Core Banking', alloc:'60%',  status:'open',     cost:1880 },
                  { p:'QA Lead',              pr:'Mercury Core Banking', alloc:'100%', status:'booked',   cost:1480 },
                  { p:'Data Migration Eng',   pr:'Helix DW Migration',   alloc:'100%', status:'open',     cost:1520 },
                ].map((r) => (
                  <tr key={r.p}>
                    <td><input type="checkbox" className="checkbox"/></td>
                    <td><span className="table-cell-strong">{r.p}</span></td>
                    <td>{r.pr}</td>
                    <td className="right num">{r.alloc}</td>
                    <td>
                      {r.status === 'open' && <StatusBadge tone="warning">Open</StatusBadge>}
                      {r.status === 'proposed' && <StatusBadge tone="info">Proposed</StatusBadge>}
                      {r.status === 'booked' && <StatusBadge tone="accent">Booked</StatusBadge>}
                      {r.status === 'assigned' && <StatusBadge tone="active">Assigned</StatusBadge>}
                    </td>
                    <td className="right mono"><Money value={r.cost}/></td>
                    <td><div className="row-actions"><button className="icon-btn icon-btn-sm" aria-label="More"><Icon name="more-v"/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpecCell>
      </Spec>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// StateView — Empty, Error, Loading, FeedbackState banners
// ─────────────────────────────────────────────────────────────────────────
function StateView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:20}}>
        <div className="label-eyebrow">DeliverIT · State primitives</div>
        <h1 className="h1" style={{marginTop:6}}>Empty · Error · Loading · Banners</h1>
        <p className="body muted">Every state has a forward action. No dead-ends.</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20}}>
        <div className="card">
          <div className="card-header"><h3>EmptyState</h3></div>
          <div className="empty-state">
            <div className="empty-icon"><Icon name="bench" size={22}/></div>
            <div className="empty-title">Nobody is on the bench</div>
            <div className="empty-body">All 186 people are currently assigned to a position. When you release someone they will appear here with suggested next fills.</div>
            <button className="btn btn-secondary btn-md"><Icon name="position"/> Open positions list</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>ErrorState</h3></div>
          <div className="error-state">
            <div className="empty-icon"><Icon name="alert" size={22}/></div>
            <div className="empty-title">We couldn't reach the EVM service</div>
            <div className="empty-body">Last refresh 14 minutes ago. Budget figures may be stale. Try refreshing, or proceed with cached data.</div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-secondary btn-md"><Icon name="refresh"/> Retry</button>
              <button className="btn btn-ghost btn-md">Use cached</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>LoadingState · skeleton</h3></div>
          <div className="card-body">
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <div className="skel" style={{width:'62%', height:18}}/>
              <div className="skel" style={{width:'92%', height:12}}/>
              <div className="skel" style={{width:'88%', height:12}}/>
              <div className="skel" style={{width:'48%', height:12}}/>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:8}}>
                <div className="skel" style={{height:60}}/>
                <div className="skel" style={{height:60}}/>
                <div className="skel" style={{height:60}}/>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>LoadingState · full-page spinner</h3></div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 20px', flexDirection:'column', gap:10}}>
            <span className="spinner" style={{width:32, height:32, borderWidth:3}}/>
            <span className="body-sm muted">Recomputing EVM…</span>
          </div>
        </div>
      </div>

      <Spec title="Banners · feedback inline" cols={1}>
        <SpecCell label="all tones">
          <div style={{display:'flex', flexDirection:'column', gap:10, width:'100%'}}>
            <div className="banner banner-active">
              <Icon name="check-circle" size={18} style={{color:'var(--color-status-active)'}}/>
              <div>
                <div className="banner-title">Position confirmed</div>
                <div className="banner-body">Priya Natarajan is booked on Mercury Core Banking — UK from 16 Jun.</div>
              </div>
            </div>
            <div className="banner banner-warning">
              <Icon name="alert" size={18} style={{color:'var(--color-status-warning)'}}/>
              <div>
                <div className="banner-title">Variance crossed −5% threshold</div>
                <div className="banner-body">Atlas ERP forecast variance is now −5.6%. RM has been auto-notified.</div>
              </div>
            </div>
            <div className="banner banner-danger">
              <Icon name="x-circle" size={18} style={{color:'var(--color-status-danger)'}}/>
              <div>
                <div className="banner-title">Approval rejected</div>
                <div className="banner-body">Director rejected the spike request. Add justification and resubmit.</div>
              </div>
            </div>
            <div className="banner banner-info">
              <Icon name="info" size={18} style={{color:'var(--color-status-info)'}}/>
              <div>
                <div className="banner-title">Data refreshed</div>
                <div className="banner-body">EVM recomputed at 14:32 UTC · all dashboards now current.</div>
              </div>
            </div>
          </div>
        </SpecCell>
      </Spec>
    </div>
  );
}

Object.assign(window, { AtomsView, MoleculesView, SurfacesView, DataView, StateView });
