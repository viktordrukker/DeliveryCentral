import { PropsWithChildren } from 'react';

import { SectionCard } from '@/components/common/SectionCard';

interface AdminSectionCardProps {
  description?: string;
  title: string;
}

export function AdminSectionCard({
  children,
  description,
  title,
}: PropsWithChildren<AdminSectionCardProps>): JSX.Element {
  return (
    <SectionCard>
      <div className="admin-section-card__header">
        <h3 className="section-card__title">{title}</h3>
        {description ? <p className="admin-section-card__description">{description}</p> : null}
      </div>
      {children}
    </SectionCard>
  );
}
