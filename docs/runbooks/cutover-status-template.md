# C0 Cutover — status update template

Copy one of the four blocks below into `#c0-flip-YYYYMMDD` at each
checkpoint. Fill in the bracketed values. **Do not skip a checkpoint
even if there is no news to share** — silence reads as ambiguity.

The full procedure lives in `docs/runbooks/CUTOVER_RUNBOOK.md`.

---

## T+5 min — 5% bucket flipped

```
C0 flip T+5 min checkpoint
==========================
Flipped at:           <ISO timestamp UTC>
Current bucket:       5%
dsRefresh share:      <pct>%       (target 3–8%)
workspaceMe share:    0%           (still OFF — flipped at T+2h)
5xx rate (5 min):     <pct>%       (baseline <pct>%, ceiling baseline × 1.5)
p95 latency:          <ms>         (baseline <ms>, ceiling baseline + 20%)
Health probe:         <ready|degraded|down>
c0-cutover tickets:   <count>
Verdict:              <ADVANCE|HOLD|ROLLBACK>
Next checkpoint:      T+30 min at <ISO timestamp UTC>
```

## T+30 min — rollback decision point #1

```
C0 flip T+30 min checkpoint
===========================
Time since T+0:       30 min
Current bucket:       5%
dsRefresh share:      <pct>%       (target 3–8%)
Error budget burn:    <pct>%       (ceiling 5%)
p95 latency delta:    <pct>%       (ceiling +20%)
Notification drops:   <count>      (target 0)
Customer complaints:  <count>      (target 0)
Verdict:              <ADVANCE|HOLD|ROLLBACK>
Next move:            25% bucket at <ISO timestamp UTC>
```

## T+1h — 25% → 50%

```
C0 flip T+1h checkpoint
=======================
Time since T+0:       1h
Current bucket:       50% (just stepped from 25%)
dsRefresh share:      <pct>%       (target 47–53%)
5xx rate (30 min):    <pct>%       (ceiling 5%)
p95 latency delta:    <pct>%       (ceiling +20%)
Outbox backlog:       <count>      (steady-state ~0)
Customer complaints:  <count>      (target 0)
Verdict:              <ADVANCE|HOLD|ROLLBACK>
Next move:            100% bucket + workspaceMe ON at <ISO timestamp UTC>
```

## T+2h — 100% + workspaceMe ON

```
C0 flip T+2h checkpoint — FLIP COMPLETE
=======================================
Time since T+0:       2h
Current bucket:       100%
dsRefresh share:      <pct>%       (target ≥99%)
workspaceMe share:    <pct>%       (target ≥99%)
5xx rate (1h):        <pct>%       (ceiling 5%)
p95 latency delta:    <pct>%       (ceiling +20%)
/api/health/deep:     <ready|degraded|down>
Customer complaints:  <count>      (target 0)
Verdict:              <C0 DECLARED FLIPPED|ROLLBACK>
Sign-off:             Director-of-Engineering <name + timestamp>
Post-flip task:       T+24h smoke of 142-item manual test plan at <ISO timestamp UTC>
```

---

## Verdict field — what each value means

| Verdict | Meaning | Action |
|---|---|---|
| `ADVANCE` | All gauges green or within budget. Proceed to next bucket. | Execute next bucket step at the scheduled time. |
| `HOLD` | One gauge is in the borderline band (e.g. error rate 3–5%, p95 +10..+20%). Need a human decision. | Page delivery-ops. Do NOT advance until either it self-clears or the lead says go. |
| `ROLLBACK` | One or more abort triggers fired. | Run rollback in `CUTOVER_RUNBOOK.md` Step 8 immediately. Target ≤30s recovery. |

## Closing the incident channel

After the T+2h block is posted with verdict `C0 DECLARED FLIPPED`,
schedule channel archival for T+24h, after the manual test plan smoke.
Pin all four checkpoint blocks before archiving.
