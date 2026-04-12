import { EmptyState } from '@/components/common/EmptyState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';

interface RoutePlaceholderPageProps {
  description: string;
  title: string;
}

export function RoutePlaceholderPage({
  description,
  title,
}: RoutePlaceholderPageProps): JSX.Element {
  return (
    <PageContainer>
      <PageHeader
        subtitle={description}
        title={title}
      />
      <SectionCard>
        <EmptyState
          description="This route is scaffolded and ready for API-backed feature work."
          title={`${title} page placeholder`}
        />
      </SectionCard>
    </PageContainer>
  );
}
