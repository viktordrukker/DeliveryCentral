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

interface RolePlanBuilderProps {
  projectId: string;
  entries: RolePlanEntryDto[];
  onUpdate: () => void;
}

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

  return (
    <div>
      <table className="dash-compact-table">
        <caption className="sr-only">Project role plan</caption>
        <thead>
          <tr>
            <th scope="col">Role</th>
            <th scope="col">Seniority</th>
            <th scope="col" style={{ width: 50, textAlign: 'right' }}>HC</th>
            <th scope="col" style={{ width: 60, textAlign: 'right' }}>Alloc %</th>
            <th scope="col" style={{ width: 80 }}>Source</th>
            <th scope="col" style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ fontWeight: 500 }}>{e.roleName}</td>
              <td>{e.seniorityLevel || '\u2014'}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.headcount}</td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.allocationPercent ?? '\u2014'}%</td>
              <td><StatusBadge status={e.source.toLowerCase()} variant="chip" /></td>
              <td>
                <button
                  className="button button--danger button--sm"
                  onClick={() => void handleDelete(e.id)}
                  style={{ fontSize: 10 }}
                  type="button"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}

          {/* Add row */}
          <tr style={{ background: 'var(--color-surface-alt)' }}>
            <td>
              <input
                className="field__control"
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Role name..."
                style={{ fontSize: 12, padding: '2px 6px' }}
                type="text"
                value={newRole}
              />
            </td>
            <td>
              <select className="field__control" onChange={(e) => setNewSeniority(e.target.value)} style={{ fontSize: 12, padding: '2px 6px' }} value={newSeniority}>
                <option value="">Any</option>
                {SENIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
            <td>
              <input className="field__control" onChange={(e) => setNewHC(e.target.value)} style={{ fontSize: 12, padding: '2px 6px', width: 40, textAlign: 'right' }} type="number" min="1" value={newHC} />
            </td>
            <td>
              <input className="field__control" onChange={(e) => setNewAlloc(e.target.value)} style={{ fontSize: 12, padding: '2px 6px', width: 50, textAlign: 'right' }} type="number" min="0" max="100" value={newAlloc} />
            </td>
            <td>
              <select className="field__control" onChange={(e) => setNewSource(e.target.value)} style={{ fontSize: 12, padding: '2px 6px' }} value={newSource}>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </td>
            <td>
              <button
                className="button button--sm"
                disabled={isAdding || !newRole.trim()}
                onClick={() => void handleAddRole()}
                style={{ fontSize: 10 }}
                type="button"
              >
                {isAdding ? '...' : 'Add'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
        <button
          className="button button--primary button--sm"
          disabled={isGenerating || entries.length === 0}
          onClick={() => void handleGenerateRequests()}
          type="button"
        >
          {isGenerating ? 'Generating...' : 'Generate Requests for Gaps'}
        </button>
      </div>
    </div>
  );
}
