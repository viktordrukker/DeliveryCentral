import { TipBalloon } from '@/components/common/TipBalloon';
import type { ComputedRag, RagSnapshotDto } from '@/lib/api/project-rag';

interface RagRadiatorProps {
  computed: ComputedRag | null;
  latestSnapshot: RagSnapshotDto | null;
  loading?: boolean;
}

const RAG_COLORS: Record<string, string> = {
  GREEN: 'var(--color-status-active)',
  AMBER: 'var(--color-status-warning)',
  RED: 'var(--color-status-danger)',
};

interface DimensionConfig {
  key: keyof ComputedRag;
  explanationKey: keyof ComputedRag;
  label: string;
  auto?: boolean;
}

const DIMENSIONS: DimensionConfig[] = [
  { key: 'staffingRag', explanationKey: 'staffingExplanation', label: 'Staffing', auto: true },
  { key: 'scheduleRag', explanationKey: 'scheduleExplanation', label: 'Schedule' },
  { key: 'budgetRag', explanationKey: 'budgetExplanation', label: 'Budget' },
  { key: 'overallRag', explanationKey: 'overallRag', label: 'Overall' },
];

export function RagRadiator({ computed, latestSnapshot, loading }: RagRadiatorProps): JSX.Element {
  if (loading) {
    return (
      <div className="rag-radiator" style={{ display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', padding: 'var(--space-5) 0' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-border)', margin: '0 auto', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: 50, height: 10, background: 'var(--color-border)', borderRadius: 3, marginTop: 'var(--space-2)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!computed) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        RAG status not yet computed for this project.
      </div>
    );
  }

  return (
    <div className="rag-radiator" data-testid="rag-radiator">
      <div style={{ display: 'flex', gap: 'var(--space-6)', justifyContent: 'center', padding: 'var(--space-4) 0' }}>
        {DIMENSIONS.map((dim) => {
          const rating = computed[dim.key] as string;
          const explanation = dim.key !== 'overallRag' ? (computed[dim.explanationKey] as string) : undefined;
          const isOverall = dim.label === 'Overall';
          const size = isOverall ? 56 : 48;

          return (
            <div key={dim.label} style={{ textAlign: 'center', position: 'relative' }}>
              {explanation ? <TipBalloon tip={explanation} arrow="top" /> : null}
              <div
                aria-label={`${dim.label}: ${rating}`}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: RAG_COLORS[rating] ?? 'var(--color-border)',
                  margin: '0 auto',
                  boxShadow: isOverall
                    ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${RAG_COLORS[rating] ?? 'var(--color-border)'}`
                    : 'var(--shadow-card)',
                  transition: 'background 0.3s ease',
                }}
              />
              <div style={{ marginTop: 'var(--space-2)', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
                {dim.label}
              </div>
              {dim.auto ? (
                <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 2 }}>auto-computed</div>
              ) : null}
            </div>
          );
        })}
      </div>

      {latestSnapshot ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-2) var(--space-4)',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--space-2)',
        }}>
          {latestSnapshot.narrative ? (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {latestSnapshot.narrative}
            </div>
          ) : null}
          <div style={{ fontSize: 10, color: 'var(--color-text-subtle)', marginTop: 'var(--space-1)' }}>
            Week of {latestSnapshot.weekStarting.slice(0, 10)}
            {latestSnapshot.isOverridden ? ' (overridden)' : ''}
          </div>
        </div>
      ) : null}
    </div>
  );
}
