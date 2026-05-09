import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { TipBalloon } from '@/components/common/TipBalloon';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { Table, type Column } from '@/components/ds';
import type { ResourceManagerDashboardResponse } from '@/lib/api/dashboard-resource-manager';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

interface ActionRow {
  rowKey: string;
  kind: 'overalloc' | 'pending' | 'request';
  index: number;
  severityLabel: string;
  severityColor: string;
  category: string;
  entity: string;
  detail: React.ReactNode;
  alloc: React.ReactNode;
  action: string;
  linkTo: string;
}

interface RmActionItemsProps {
  overallocated: ResourceManagerDashboardResponse['allocationIndicators'];
  pendingApprovals: ResourceManagerDashboardResponse['pendingAssignmentApprovals'];
  incomingRequests: ResourceManagerDashboardResponse['incomingRequests'];
}

export function RmActionItems({
  overallocated,
  pendingApprovals,
  incomingRequests,
}: RmActionItemsProps): JSX.Element {
  const navigate = useNavigate();
  const totalCount = overallocated.length + pendingApprovals.length + incomingRequests.length;

  if (totalCount === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-status-active)' }}>
        <span style={{ fontSize: 22 }}>{'✓'}</span>{' '}
        <span style={{ fontWeight: 600 }}>All clear</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>
          No overallocations, pending approvals, or open requests
        </span>
      </div>
    );
  }

  const rows: ActionRow[] = [
    ...overallocated.map((item, i) => ({
      rowKey: `over-${item.personId}`,
      kind: 'overalloc' as const,
      index: i + 1,
      severityLabel: 'High',
      severityColor: 'var(--color-status-danger)',
      category: 'Overallocated',
      entity: item.displayName,
      detail: <span style={{ fontSize: 11 }}>{item.teamName}</span> as React.ReactNode,
      alloc: (
        <span style={{ ...NUM, color: 'var(--color-status-danger)', fontWeight: 600 }}>
          {item.totalAllocationPercent}%
        </span>
      ) as React.ReactNode,
      action: 'Rebalance assignments',
      linkTo: `/people/${item.personId}`,
    })),
    ...pendingApprovals.map((item, i) => ({
      rowKey: `pend-${item.assignmentId}`,
      kind: 'pending' as const,
      index: overallocated.length + i + 1,
      severityLabel: 'Med',
      severityColor: 'var(--color-status-warning)',
      category: 'Pending Approval',
      entity: item.personDisplayName,
      detail: <span style={{ fontSize: 11 }}>{item.projectName}</span> as React.ReactNode,
      alloc: <span style={NUM}>{'—'}</span> as React.ReactNode,
      action: 'Review & approve',
      linkTo: `/assignments/${item.assignmentId}`,
    })),
    ...incomingRequests.map((req, i) => ({
      rowKey: `req-${req.id}`,
      kind: 'request' as const,
      index: overallocated.length + pendingApprovals.length + i + 1,
      severityLabel: 'Info',
      severityColor: 'var(--color-status-info)',
      category: 'Staffing Request',
      entity: req.role,
      detail: (
        <span style={{ fontSize: 11 }}>
          <PriorityBadge priority={req.priority} /> · starts {req.startDate}
        </span>
      ) as React.ReactNode,
      alloc: (
        <span style={NUM}>
          {req.headcountFulfilled}/{req.headcountRequired}
        </span>
      ) as React.ReactNode,
      action: 'Review & fill',
      linkTo: `/staffing-requests/${req.id}`,
    })),
  ];

  return (
    <div className="dash-action-section" style={{ position: 'relative' }}>
      <TipBalloon
        tip="Items needing attention — overallocations, pending approvals, and incoming staffing requests. Click any row to act."
        arrow="left"
      />
      <div className="dash-action-section__header">
        <span className="dash-action-section__title">Action Items ({totalCount})</span>
      </div>
      <Table
        variant="compact"
        columns={
          [
            {
              key: 'idx',
              title: '#',
              width: 28,
              render: (r) => (
                <span style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{r.index}</span>
              ),
            },
            {
              key: 'severity',
              title: 'Severity',
              width: 70,
              render: (r) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: r.severityColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: r.severityColor, fontWeight: 600, fontSize: 11 }}>
                    {r.severityLabel}
                  </span>
                </span>
              ),
            },
            { key: 'category', title: 'Category', width: 120, render: (r) => r.category },
            {
              key: 'entity',
              title: 'Entity',
              render: (r) => <span style={{ fontWeight: 500 }}>{r.entity}</span>,
            },
            { key: 'detail', title: 'Detail', width: 140, render: (r) => r.detail },
            { key: 'alloc', title: 'Alloc %', align: 'right', render: (r) => r.alloc },
            {
              key: 'action',
              title: 'Suggested Action',
              width: 100,
              render: (r) => <span style={{ fontSize: 11 }}>{r.action}</span>,
            },
            {
              key: 'go',
              title: '',
              width: 40,
              render: (r) => (
                <Link
                  to={r.linkTo}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 10, color: 'var(--color-accent)' }}
                >
                  View
                </Link>
              ),
            },
          ] as Column<ActionRow>[]
        }
        rows={rows}
        getRowKey={(r) => r.rowKey}
        onRowClick={(r) => navigate(r.linkTo)}
        footer={
          <div
            style={{
              padding: 'var(--space-2) var(--space-3)',
              fontWeight: 600,
              fontSize: 11,
              background: 'var(--color-surface-alt)',
            }}
          >
            {totalCount} total items
          </div>
        }
      />
    </div>
  );
}
