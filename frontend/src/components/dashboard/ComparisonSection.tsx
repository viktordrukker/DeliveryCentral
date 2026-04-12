import { ReactNode } from 'react';

import { EmptyState } from '@/components/common/EmptyState';

interface ComparisonSectionProps<TItem> {
  emptyDescription: string;
  items: TItem[];
  renderItem: (item: TItem) => ReactNode;
  title: string;
}

export function ComparisonSection<TItem>({
  emptyDescription,
  items,
  renderItem,
  title,
}: ComparisonSectionProps<TItem>): JSX.Element {
  return (
    <section className="comparison-section">
      <h3 className="section-card__title">{title}</h3>
      {items.length === 0 ? (
        <EmptyState description={emptyDescription} title={`No ${title.toLowerCase()}`} />
      ) : (
        <div className="comparison-list">
          {items.map((item, index) => (
            <article className="comparison-card" key={index}>
              {renderItem(item)}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
