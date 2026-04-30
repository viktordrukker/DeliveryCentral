import { useState } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/common/StatusBadge';
import {
  RolePlanEntryDto,
  UpsertRolePlanEntryRequest,
  deleteRolePlanEntry,
  generateRequestsFromPlan,
  upsertRolePlan,
} from '@/lib/api/project-role-plan';
import { Button, Input, Select, Table, type Column } from '@/components/ds';

interface RolePlanBuilderProps {
  projectId: string;
  entries: RolePlanEntryDto[];
  onUpdate: () => void;
}

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

const SENIORITY_OPTIONS = ['Junior', 'Mid', 'Senior', 'Lead', 'Architect', 'Manager'];
const SOURCE_OPTIONS = [
  { label: 'Internal', value: 'INTERNAL' },
  { label: 'Vendor', value: 'VENDOR' },
  { label: 'Either', value: 'EITHER' },
];

export function RolePlanBuilder({ projectId, entries, onUpdate }: RolePlanBuilderProps): JSX.Element {
  const [newRole, setNewRole] = useState('');
  const [newSeniority, setNewSeniority] = useState('');
  const [newHC, setNewHC] = useState('1');
  const [newAlloc, setNewAlloc] = useState('100');
  const [newSource, setNewSource] = useState('INTERNAL');
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleAddRole(): Promise<void> {
    if (!newRole.trim()) return;
    setIsAdding(true);
    try {
      const entry: UpsertRolePlanEntryRequest = {
        roleName: newRole.trim(),
        seniorityLevel: newSeniority || undefined,
        headcount: parseInt(newHC) || 1,
        allocationPercent: parseInt(newAlloc) || 100,
        source: newSource,
      };
      await upsertRolePlan(projectId, [entry]);
      setNewRole('');
      setNewSeniority('');
      setNewHC('1');
      setNewAlloc('100');
      toast.success('Role added to plan');
      onUpdate();
    } catch {
      toast.error('Failed to add role');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(entryId: string): Promise<void> {
    try {
      await deleteRolePlanEntry(projectId, entryId);
      toast.success('Role removed from plan');
      onUpdate();
    } catch {
      toast.error('Failed to remove role');
    }
  }

  async function handleGenerateRequests(): Promise<void> {
    setIsGenerating(true);
    try {
      const result = await generateRequestsFromPlan(projectId);
      if (result.createdRequestIds.length > 0) {
        toast.success(`Created ${result.createdRequestIds.length} staffing request(s)`);
      } else if (result.totalGaps === 0) {
        toast.info('No gaps found — all roles are filled');
      } else {
        toast.info(`No new requests created (${result.skippedCount} already exist)`);
      }
    } catch {
      toast.error('Failed to generate requests');
    } finally {
      setIsGenerating(false);
    }
  }

  const columns: Column<RolePlanEntryDto>[] = [
    { key: 'role', title: 'Role', getValue: (e) => e.roleName, render: (e) => <span style={{ fontWeight: 500 }}>{e.roleName}</span> },
    { key: 'seniority', title: 'Seniority', getValue: (e) => e.seniorityLevel ?? '', render: (e) => e.seniorityLevel || '—' },
    { key: 'hc', title: 'HC', align: 'right', width: 50, getValue: (e) => e.headcount, render: (e) => <span style={NUM}>{e.headcount}</span> },
    { key: 'alloc', title: 'Alloc %', align: 'right', width: 60, getValue: (e) => e.allocationPercent ?? 0, render: (e) => <span style={NUM}>{e.allocationPercent ?? '—'}%</span> },
    { key: 'source', title: 'Source', width: 80, getValue: (e) => e.source, render: (e) => <StatusBadge status={e.source.toLowerCase()} variant="chip" /> },
    { key: 'actions', title: '', width: 60, render: (e) => (
      <Button variant="danger" size="sm" onClick={() => void handleDelete(e.id)} type="button">Remove</Button>
    ) },
  ];

  return (
    <div>
      {entries.length > 0 ? (
        <Table
          variant="compact"
          columns={columns}
          rows={entries}
          getRowKey={(e) => e.id}
        />
      ) : (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 'var(--space-3)' }}>
          No roles defined yet. Add one below to start tracking staffing.
        </p>
      )}

      {/* Add new role row */}
      <div style={{
        marginTop: 'var(--space-3)',
        padding: 'var(--space-2)',
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        display: 'grid',
        gridTemplateColumns: '1fr 120px 60px 70px 100px auto',
        gap: 'var(--space-2)',
        alignItems: 'end',
      }}>
        <Input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role name..." />
        <Select value={newSeniority} onChange={(e) => setNewSeniority(e.target.value)}>
          <option value="">Any</option>
          {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Input type="number" min={1} value={newHC} onChange={(e) => setNewHC(e.target.value)} style={{ textAlign: 'right' }} />
        <Input type="number" min={0} max={100} value={newAlloc} onChange={(e) => setNewAlloc(e.target.value)} style={{ textAlign: 'right' }} />
        <Select value={newSource} onChange={(e) => setNewSource(e.target.value)}>
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Button variant="primary" size="sm" disabled={isAdding || !newRole.trim()} onClick={() => void handleAddRole()} type="button">
          {isAdding ? '…' : 'Add'}
        </Button>
      </div>

      <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="sm" disabled={isGenerating || entries.length === 0} onClick={() => void handleGenerateRequests()} type="button">
          {isGenerating ? 'Generating...' : 'Generate Requests for Gaps'}
        </Button>
      </div>
    </div>
  );
}
