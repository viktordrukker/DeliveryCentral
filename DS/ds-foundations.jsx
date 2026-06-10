// ds-foundations.jsx — Tokens reference: colors, type, spacing, radii, shadows.

function Swatch({ name, cssVar, value, large }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:12, padding:'6px 0'}}>
      <span style={{
        width: large ? 56 : 36, height: large ? 56 : 36,
        borderRadius:6, background:`var(${cssVar})`,
        border:'1px solid var(--color-border)', flexShrink:0,
      }}/>
      <div style={{minWidth:0, flex:1}}>
        <div className="body-sm" style={{fontWeight:500}}>{name}</div>
        <div className="compact-sm muted mono" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{cssVar}</div>
      </div>
      {value && <div className="compact-sm muted mono">{value}</div>}
    </div>
  );
}

function ColorBlock({ title, swatches, cols = 3 }) {
  return (
    <div className="card">
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body" style={{display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:'8px 24px'}}>
        {swatches.map((s) => <Swatch key={s.name} {...s}/>)}
      </div>
    </div>
  );
}

function FoundationsView() {
  return (
    <div style={{padding:'32px 40px', maxWidth:1320, margin:'0 auto'}}>
      <div style={{marginBottom:28}}>
        <div className="label-eyebrow">DeliverIT · Foundations</div>
        <h1 className="h1" style={{marginTop:6, marginBottom:6}}>Tokens</h1>
        <p className="body muted" style={{maxWidth:680}}>
          One mode-aware token sheet. All colors carry a light + dark value with semantic alignment. Spacing on the 4-px grid; type scale anchored to body-14. Status semantics are <strong>fixed</strong> — they encode meaning, not vibe.
        </p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr', gap:20}}>
        <ColorBlock title="Surfaces" cols={3} swatches={[
          { name:'bg',             cssVar:'--color-bg' },
          { name:'surface',        cssVar:'--color-surface' },
          { name:'surface-alt',    cssVar:'--color-surface-alt' },
          { name:'border-subtle',  cssVar:'--color-border-subtle' },
          { name:'border',         cssVar:'--color-border' },
          { name:'border-strong',  cssVar:'--color-border-strong' },
        ]}/>

        <ColorBlock title="Text" cols={3} swatches={[
          { name:'text',           cssVar:'--color-text' },
          { name:'text-muted',     cssVar:'--color-text-muted' },
          { name:'text-subtle',    cssVar:'--color-text-subtle' },
        ]}/>

        <ColorBlock title="Brand accent" cols={3} swatches={[
          { name:'accent',         cssVar:'--color-accent',       value:'oklch(0.40 0.13 254)' },
          { name:'accent-hover',   cssVar:'--color-accent-hover' },
          { name:'accent-soft',    cssVar:'--color-accent-soft' },
        ]}/>

        <ColorBlock title="Status (fixed semantics)" cols={3} swatches={[
          { name:'status-active · healthy',    cssVar:'--color-status-active' },
          { name:'status-warning · amber',     cssVar:'--color-status-warning' },
          { name:'status-danger · red',        cssVar:'--color-status-danger' },
          { name:'status-critical · dark red', cssVar:'--color-status-critical' },
          { name:'status-info · cyan',         cssVar:'--color-status-info' },
          { name:'status-pending · grey',      cssVar:'--color-status-pending' },
        ]}/>

        <ColorBlock title="Chart palette · 8 sequential" cols={4} swatches={[
          { name:'chart-1', cssVar:'--color-chart-1' },
          { name:'chart-2', cssVar:'--color-chart-2' },
          { name:'chart-3', cssVar:'--color-chart-3' },
          { name:'chart-4', cssVar:'--color-chart-4' },
          { name:'chart-5', cssVar:'--color-chart-5' },
          { name:'chart-6', cssVar:'--color-chart-6' },
          { name:'chart-7', cssVar:'--color-chart-7' },
          { name:'chart-8', cssVar:'--color-chart-8' },
        ]}/>

        <ColorBlock title="Utilization heatmap · 5 bands" cols={5} swatches={[
          { name:'critical >120%', cssVar:'--color-util-critical' },
          { name:'over 100–120%',  cssVar:'--color-util-over' },
          { name:'optimal 60–100%', cssVar:'--color-util-optimal' },
          { name:'under 30–60%',   cssVar:'--color-util-under' },
          { name:'idle 0–30%',     cssVar:'--color-util-idle' },
        ]}/>

        {/* Type scale */}
        <div className="card">
          <div className="card-header"><h3>Type scale · Geist + Geist Mono</h3></div>
          <div className="card-body" style={{display:'flex', flexDirection:'column', gap:14}}>
            {[
              { label:'h1 · 28px / 600',     cls:'h1',     sample:'Project Pulse — Mercury Core Banking — UK' },
              { label:'h2 · 22px / 600',     cls:'h2',     sample:'Open & in-flight positions' },
              { label:'h3 · 18px / 600',     cls:'h3',     sample:'RAG quadrant · this week' },
              { label:'body · 14px / 400',   cls:'body',   sample:'Mercury Core Banking — UK is a 14-month programme.' },
              { label:'body-sm · 13px / 400',cls:'body-sm',sample:'PM Ethan Brooks · 18 of 40 weeks elapsed.' },
              { label:'compact · 12px / 400',cls:'compact',sample:'Hint, metadata, table secondary text.' },
              { label:'compact-sm · 11px',   cls:'compact-sm',sample:'Eyebrow, dense table caption.' },
              { label:'mono · code/tabular', cls:'mono',   sample:'EID-04812  ·  $1,650 / day  ·  −8.2%' },
            ].map((t) => (
              <div key={t.label} style={{display:'grid', gridTemplateColumns:'180px 1fr', gap:24, alignItems:'baseline', paddingBottom:10, borderBottom:'1px solid var(--color-border-subtle)'}}>
                <span className="compact muted mono">{t.label}</span>
                <span className={t.cls}>{t.sample}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spacing, radii, shadows */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:20}}>
          <div className="card">
            <div className="card-header"><h3>Spacing · 4px grid</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:8}}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => {
                const sizes = {1:4,2:8,3:12,4:16,5:20,6:24,7:32,8:40,9:56,10:80};
                return (
                  <div key={n} style={{display:'flex', alignItems:'center', gap:12}}>
                    <span className="compact-sm muted mono" style={{width:80}}>--space-{n}</span>
                    <span style={{height:8, background:'var(--color-accent)', width:sizes[n], borderRadius:2}}/>
                    <span className="compact muted mono">{sizes[n]}px</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Radius</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:14}}>
              {[
                { name:'sm · 4',      r:4  },
                { name:'control · 6', r:6  },
                { name:'md · 6',      r:6  },
                { name:'card · 10',   r:10 },
                { name:'lg · 10',     r:10 },
                { name:'pill · 999',  r:999},
              ].map((r) => (
                <div key={r.name} style={{display:'flex', alignItems:'center', gap:12}}>
                  <div style={{width:48, height:32, background:'var(--color-accent-soft)', border:'1px solid var(--color-accent)', borderRadius:r.r}}/>
                  <span className="compact muted mono">--radius-{r.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Shadows</h3></div>
            <div className="card-body" style={{display:'flex', flexDirection:'column', gap:18}}>
              {[
                { name:'card',     css:'var(--shadow-card)' },
                { name:'dropdown', css:'var(--shadow-dropdown)' },
                { name:'modal',    css:'var(--shadow-modal)' },
              ].map((s) => (
                <div key={s.name} style={{display:'flex', alignItems:'center', gap:14}}>
                  <div style={{width:80, height:48, background:'var(--color-surface)', boxShadow: s.css, borderRadius:6, border:'1px solid var(--color-border-subtle)'}}/>
                  <span className="compact muted mono">--shadow-{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakpoints */}
        <div className="card">
          <div className="card-header"><h3>Breakpoints &amp; constraints</h3></div>
          <div className="card-body" style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16}}>
            {[
              { label:'sm · mobile',  px:'≤ 640' },
              { label:'md · tablet',  px:'≤ 1024' },
              { label:'lg · desktop', px:'≤ 1280' },
              { label:'xl · large',   px:'≥ 1536' },
            ].map((b) => (
              <div key={b.label} style={{padding:14, border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)'}}>
                <div className="body-sm" style={{fontWeight:500}}>{b.label}</div>
                <div className="mono compact muted" style={{marginTop:4}}>{b.px} px</div>
              </div>
            ))}
            <div style={{padding:14, border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', gridColumn:'span 2', background:'var(--color-surface-alt)'}}>
              <div className="body-sm" style={{fontWeight:500}}><Icon name="check-circle" size={14} style={{color:'var(--color-status-active)'}}/> Touch target min · 44px</div>
              <div className="compact muted" style={{marginTop:4}}>Enforced below md breakpoint and on coarse pointer.</div>
            </div>
            <div style={{padding:14, border:'1px solid var(--color-border)', borderRadius:'var(--radius-card)', gridColumn:'span 2', background:'var(--color-surface-alt)'}}>
              <div className="body-sm" style={{fontWeight:500}}><Icon name="check-circle" size={14} style={{color:'var(--color-status-active)'}}/> Animation cap · 250ms · reduced-motion safe</div>
              <div className="compact muted" style={{marginTop:4}}>Token: --duration-slow. Zeroed when prefers-reduced-motion.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.FoundationsView = FoundationsView;
