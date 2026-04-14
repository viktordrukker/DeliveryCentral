import { useRef, useState } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import {
  BulkImportPreviewRow,
  BulkImportConfirmResponse,
  confirmBulkImport,
  previewBulkImport,
} from '@/lib/api/bulk-import';

const CSV_TEMPLATE = `givenName,familyName,email,grade,role
Jane,Smith,jane.smith@example.com,Senior,engineer
John,Doe,john.doe@example.com,,`;

export function BulkImportPage(): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewRows, setPreviewRows] = useState<BulkImportPreviewRow[] | null>(null);
  const [invalidRows, setInvalidRows] = useState<{ errors: string[]; row: number }[]>([]);
  const [result, setResult] = useState<BulkImportConfirmResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  }

  async function handlePreview(): Promise<void> {
    setError(null);
    setPreviewRows(null);
    setInvalidRows([]);
    setResult(null);
    setPreviewing(true);
    try {
      const response = await previewBulkImport(csvText);
      setPreviewRows(response.valid);
      setInvalidRows(response.invalid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!previewRows) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await confirmBulkImport(previewRows);
      setResult(res);
      setPreviewRows(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setConfirming(false);
    }
  }

  function handleDownloadTemplate(): void {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'people-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer viewport>
      <PageHeader
        eyebrow="Admin"
        subtitle="Import up to 200+ employees from a CSV file. Preview before confirming."
        title="Bulk People Import"
      />

      {error ? <ErrorState description={error} /> : null}

      {result ? (
        <SectionCard title="Import Complete">
          <dl className="detail-list">
            <dt>Created</dt>
            <dd style={{ color: 'var(--color-status-active)', fontWeight: 600 }}>{result.created}</dd>
            <dt>Skipped (already exist)</dt>
            <dd>{result.skipped}</dd>
            <dt>Failed</dt>
            <dd style={{ color: result.failed.length > 0 ? 'var(--color-status-danger)' : undefined }}>{result.failed.length}</dd>
          </dl>
          {result.failed.length > 0 ? (
            <table className="dash-compact-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.failed.map((f) => (
                  <tr key={f.email}>
                    <td>{f.email}</td>
                    <td style={{ color: 'var(--color-status-danger)' }}>{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <button
            className="button button--secondary"
            onClick={() => { setResult(null); setCsvText(''); }}
            style={{ marginTop: '1rem' }}
            type="button"
          >
            Import Another File
          </button>
        </SectionCard>
      ) : (
        <>
          <SectionCard title="1. Upload CSV">
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
              Required columns: <code>givenName</code>, <code>familyName</code>, <code>email</code>. Optional: <code>grade</code>, <code>role</code>.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="button button--secondary"
                onClick={handleDownloadTemplate}
                type="button"
              >
                Download Template
              </button>
              <button
                className="button button--secondary"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                Choose File
              </button>
              <input
                accept=".csv,.txt"
                onChange={(e) => void handleFileChange(e)}
                ref={fileRef}
                style={{ display: 'none' }}
                type="file"
              />
            </div>
            <textarea
              className="field__control"
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={CSV_TEMPLATE}
              rows={8}
              style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.8rem', width: '100%' }}
              value={csvText}
            />
            <button
              className="button"
              disabled={!csvText.trim() || previewing}
              onClick={() => void handlePreview()}
              style={{ marginTop: '0.75rem' }}
              type="button"
            >
              {previewing ? 'Validating...' : 'Validate & Preview'}
            </button>
          </SectionCard>

          {previewRows !== null ? (
            <SectionCard title={`2. Review — ${previewRows.length} valid, ${invalidRows.length} invalid`}>
              {invalidRows.length > 0 ? (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--color-status-danger)', fontWeight: 600 }}>Invalid rows (will be skipped):</p>
                  {invalidRows.map((inv) => (
                    <p key={inv.row} style={{ color: 'var(--color-status-danger)', fontSize: '0.875rem' }}>
                      Row {inv.row}: {inv.errors.join('; ')}
                    </p>
                  ))}
                </div>
              ) : null}

              {previewRows.length > 0 ? (
                <>
                  <table className="dash-compact-table">
                    <thead>
                      <tr>
                        <th>Given Name</th>
                        <th>Family Name</th>
                        <th>Email</th>
                        <th>Grade</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 20).map((row) => (
                        <tr key={row.email} style={{ background: 'var(--color-success-bg)' }}>
                          <td>{row.givenName}</td>
                          <td>{row.familyName}</td>
                          <td>{row.email}</td>
                          <td>{row.grade ?? '—'}</td>
                          <td>{row.role ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewRows.length > 20 ? (
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      ...and {previewRows.length - 20} more rows.
                    </p>
                  ) : null}
                  <button
                    className="button"
                    disabled={confirming}
                    onClick={() => void handleConfirm()}
                    style={{ marginTop: '1rem' }}
                    type="button"
                  >
                    {confirming ? 'Importing...' : `Confirm Import (${previewRows.length} people)`}
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--color-status-warning)' }}>No valid rows to import. Check the invalid row errors above.</p>
              )}
            </SectionCard>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
