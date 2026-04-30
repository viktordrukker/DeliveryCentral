import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  BuilderSource,
  ReportColumnDef,
  ReportDataSource,
  ReportFilter,
  ReportTemplate,
  deleteReportTemplate,
  fetchBuilderSources,
  fetchReportTemplates,
  saveReportTemplate,
} from '@/lib/api/report-builder';
import { useAuth } from '@/app/auth-context';
import { Button, IconButton, Table } from '@/components/ds';

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'contains', label: 'contains' },
  { value: 'startsWith', label: 'starts with' },
] as const;

export function ReportBuilderPage(): JSX.Element {
  const { principal } = useAuth();
  const [sources, setSources] = useState<BuilderSource[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [dataSource, setDataSource] = useState<ReportDataSource>('people');
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [isShared, setIsShared] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSource = sources.find((s) => s.source === dataSource);
  const columns: ReportColumnDef[] = currentSource?.columns ?? [];

  useEffect(() => {
    void fetchBuilderSources().then(setSources).catch(() => undefined);
    void fetchReportTemplates(principal?.personId).then(setTemplates).catch(() => undefined);
  }, [principal?.personId]);

  function toggleColumn(key: string): void {
    setSelectedCols((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function addFilter(): void {
    if (columns.length === 0) return;
    setFilters((prev) => [...prev, { field: columns[0].key, operator: 'eq', value: '' }]);
  }

  function updateFilter(index: number, partial: Partial<ReportFilter>): void {
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...partial } : f)));
  }

  function removeFilter(index: number): void {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPreviewData(): Record<string, string>[] {
    // Preview is synthetic — in a real impl, we'd call a query endpoint
    const cols = selectedCols.length > 0 ? selectedCols : columns.map((c) => c.key);
    return [
      Object.fromEntries(cols.map((c) => [c, '(sample value)'])),
      Object.fromEntries(cols.map((c) => [c, '(sample value)'])),
    ];
  }

  function handleExport(): void {
    const data = buildPreviewData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `report-${dataSource}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleSave(): Promise<void> {
    if (!templateName) return;
    setSaving(true);
    try {
      const saved = await saveReportTemplate({
        name: templateName,
        ownerPersonId: principal?.personId ?? '',
        dataSource,
        selectedColumns: selectedCols,
        filters,
        sortBy: sortBy || undefined,
        sortDir,
        isShared,
      });
      setTemplates((prev) => [...prev, saved]);
      setTemplateName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate(id: string): Promise<void> {
    try {
      await deleteReportTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete template.');
    }
  }

  function handleLoadTemplate(t: ReportTemplate): void {
    setDataSource(t.dataSource);
    setSelectedCols(t.selectedColumns);
    setFilters(t.filters);
    setSortBy(t.sortBy ?? '');
    setSortDir(t.sortDir ?? 'asc');
    setIsShared(t.isShared);
    setTemplateName(t.name);
  }

  const previewData = buildPreviewData();

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Reports"
        subtitle="Build custom reports by selecting a data source, columns, and filters. Save as templates and export to XLSX."
        title="Custom Report Builder"
      />

      {error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '0.75rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Config panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label className="field">
            <span className="field__label">Data Source</span>
            <select
              className="field__control"
              onChange={(e) => {
                setDataSource(e.target.value as ReportDataSource);
                setSelectedCols([]);
                setFilters([]);
                setSortBy('');
              }}
              value={dataSource}
            >
              {sources.map((s) => (
                <option key={s.source} value={s.source}>{s.source}</option>
              ))}
            </select>
          </label>

          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.25rem' }}>Columns</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {columns.map((col) => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    checked={selectedCols.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    type="checkbox"
                  />
                  {col.label}
                  <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>({col.type})</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>Filters</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={addFilter}
                style={{ fontSize: '0.7rem', padding: '1px 6px' }}
                type="button"
              >
                + Add
              </Button>
            </div>
            {filters.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  onChange={(e) => updateFilter(i, { field: e.target.value })}
                  style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, flex: '1 1 80px' }}
                  value={f.field}
                >
                  {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <select
                  onChange={(e) => updateFilter(i, { operator: e.target.value as ReportFilter['operator'] })}
                  style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, flex: '0 0 80px' }}
                  value={f.operator}
                >
                  {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <input
                  onChange={(e) => updateFilter(i, { value: e.target.value })}
                  placeholder="value"
                  style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, flex: '1 1 60px' }}
                  type="text"
                  value={f.value}
                />
                <IconButton
                  aria-label="Remove filter"
                  size="sm"
                  onClick={() => removeFilter(i)}
                  style={{ color: 'var(--color-status-danger)', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  ✕
                </IconButton>
              </div>
            ))}
          </div>

          <label className="field">
            <span className="field__label">Sort by</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                className="field__control"
                onChange={(e) => setSortBy(e.target.value)}
                style={{ flex: 1 }}
                value={sortBy}
              >
                <option value="">None</option>
                {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <select
                className="field__control"
                onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                style={{ flex: '0 0 70px' }}
                value={sortDir}
              >
                <option value="asc">↑ Asc</option>
                <option value="desc">↓ Desc</option>
              </select>
            </div>
          </label>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="field">
              <span className="field__label">Template name</span>
              <input
                className="field__control"
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="My report…"
                type="text"
                value={templateName}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                type="checkbox"
              />
              Share with all users
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" disabled={!templateName || saving} onClick={() => void handleSave()} style={{ flex: 1, fontSize: '0.8rem' }} type="button">
                {saving ? 'Saving…' : 'Save Template'}
              </Button>
              <Button variant="primary" disabled={selectedCols.length === 0} onClick={handleExport} style={{ flex: 1, fontSize: '0.8rem' }} type="button">
                Export XLSX
              </Button>
            </div>
          </div>
        </div>

        {/* Preview + templates */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Preview</h3>
          <div style={{ marginBottom: '1.5rem' }}>
            <Table
              variant="compact"
              columns={(selectedCols.length > 0 ? selectedCols : columns.map((c) => c.key)).map((key) => ({
                key,
                title: columns.find((c) => c.key === key)?.label ?? key,
                getValue: (row: Record<string, string>) => row[key] ?? '',
                render: (row: Record<string, string>) => (
                  <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{row[key] ?? ''}</span>
                ),
              }))}
              rows={previewData}
              getRowKey={(_row, i) => String(i)}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Preview shows synthetic placeholder rows. Export for real data.</p>
          </div>

          {templates.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>Saved Templates</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t.name}</span>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '6px' }}>
                        {t.dataSource} · {t.selectedColumns.length || 'all'} columns
                        {t.isShared ? ' · shared' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button variant="secondary" onClick={() => handleLoadTemplate(t)} style={{ fontSize: '0.75rem', padding: '2px 8px' }} type="button">
                        Load
                      </Button>
                      <Button variant="danger" onClick={() => void handleDeleteTemplate(t.id)} style={{ fontSize: '0.75rem', padding: '2px 8px' }} type="button">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
