import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

// HD-11 — single source of truth for application metrics.
//
// Convention: every metric registered here gets a `dc_` prefix so a
// scraper can isolate DeliveryCentral metrics from default Node ones
// (which still carry the `nodejs_` / `process_` prefixes).
//
// We expose individual `inc*()` helpers per call site so the call
// sites stay typed and the metric names stay one-grep-target. Adding
// a new metric is one line in `register*Metrics()` plus one helper.
@Injectable()
export class MetricsService implements OnModuleInit {
  public readonly registry = new Registry();

  // Outbox publisher
  private outboxClaimed!: Counter<string>;
  private outboxDispatched!: Counter<string>;
  private outboxFailed!: Counter<string>;
  private outboxRetried!: Counter<string>;
  private outboxBacklog!: Gauge<string>;

  // SLA sweep
  private slaSweepTicks!: Counter<string>;
  private slaBreached!: Counter<string>;
  private slaPreBreachWarned!: Counter<string>;

  // Nudge sweep
  private nudgeSweepTicks!: Counter<string>;
  private nudgesEmitted!: Counter<string>;
  private nudgesSuppressed!: Counter<string>;

  public onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry, prefix: 'dc_' });
    this.registerOutboxMetrics();
    this.registerSlaMetrics();
    this.registerNudgeMetrics();
  }

  private registerOutboxMetrics(): void {
    this.outboxClaimed = new Counter({
      name: 'dc_outbox_events_claimed_total',
      help: 'Outbox rows the publisher has claimed for dispatch.',
      registers: [this.registry],
    });
    this.outboxDispatched = new Counter({
      name: 'dc_outbox_events_dispatched_total',
      help: 'Outbox rows successfully handed off to a registered handler.',
      labelNames: ['event_name'],
      registers: [this.registry],
    });
    this.outboxFailed = new Counter({
      name: 'dc_outbox_events_failed_total',
      help: 'Outbox rows the publisher gave up on after exhausting retries.',
      labelNames: ['event_name'],
      registers: [this.registry],
    });
    this.outboxRetried = new Counter({
      name: 'dc_outbox_events_retried_total',
      help: 'Outbox rows that failed dispatch and were rescheduled.',
      labelNames: ['event_name'],
      registers: [this.registry],
    });
    this.outboxBacklog = new Gauge({
      name: 'dc_outbox_events_backlog',
      help: 'Last-observed count of PENDING / RETRY rows waiting in the outbox.',
      registers: [this.registry],
    });
  }

  private registerSlaMetrics(): void {
    this.slaSweepTicks = new Counter({
      name: 'dc_assignment_sla_sweep_ticks_total',
      help: 'AssignmentSlaSweepService cycles run.',
      registers: [this.registry],
    });
    this.slaBreached = new Counter({
      name: 'dc_assignment_sla_breached_total',
      help: 'Assignments newly marked as SLA-breached by the sweep.',
      labelNames: ['sla_stage'],
      registers: [this.registry],
    });
    this.slaPreBreachWarned = new Counter({
      name: 'dc_assignment_sla_pre_breach_warned_total',
      help: 'Pre-breach warnings emitted, labelled by warn level (50pct/75pct).',
      labelNames: ['warn_level', 'sla_stage'],
      registers: [this.registry],
    });
  }

  private registerNudgeMetrics(): void {
    this.nudgeSweepTicks = new Counter({
      name: 'dc_nudge_sweep_ticks_total',
      help: 'NudgeSweeperService cycles run.',
      registers: [this.registry],
    });
    this.nudgesEmitted = new Counter({
      name: 'dc_nudges_emitted_total',
      help: 'Nudge.* events emitted by the sweeper, labelled by category.',
      labelNames: ['category'],
      registers: [this.registry],
    });
    this.nudgesSuppressed = new Counter({
      name: 'dc_nudges_suppressed_total',
      help: 'Nudge candidates suppressed by the dedup window, labelled by category.',
      labelNames: ['category'],
      registers: [this.registry],
    });
  }

  /* ── Outbox helpers ──────────────────────────────────────────── */

  public incOutboxClaimed(count = 1): void {
    this.outboxClaimed.inc(count);
  }

  public incOutboxDispatched(eventName: string): void {
    this.outboxDispatched.inc({ event_name: eventName });
  }

  public incOutboxFailed(eventName: string): void {
    this.outboxFailed.inc({ event_name: eventName });
  }

  public incOutboxRetried(eventName: string): void {
    this.outboxRetried.inc({ event_name: eventName });
  }

  public setOutboxBacklog(count: number): void {
    this.outboxBacklog.set(count);
  }

  /* ── SLA helpers ─────────────────────────────────────────────── */

  public incSlaSweepTick(): void {
    this.slaSweepTicks.inc();
  }

  public incSlaBreached(slaStage: string): void {
    this.slaBreached.inc({ sla_stage: slaStage });
  }

  public incSlaPreBreachWarned(warnLevel: '50pct' | '75pct', slaStage: string): void {
    this.slaPreBreachWarned.inc({ warn_level: warnLevel, sla_stage: slaStage });
  }

  /* ── Nudge sweep helpers ─────────────────────────────────────── */

  public incNudgeSweepTick(): void {
    this.nudgeSweepTicks.inc();
  }

  public incNudgeEmitted(category: string): void {
    this.nudgesEmitted.inc({ category });
  }

  public incNudgeSuppressed(category: string): void {
    this.nudgesSuppressed.inc({ category });
  }
}
