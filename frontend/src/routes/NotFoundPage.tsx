import { Link } from 'react-router-dom';

import { PageContainer } from '@/components/common/PageContainer';

export function NotFoundPage(): JSX.Element {
  return (
    <PageContainer testId="not-found-page">
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '5rem', fontWeight: 700, lineHeight: 1, margin: 0 }}>
          404
        </p>
        <h1 style={{ fontSize: '1.5rem', margin: '1rem 0 0.5rem' }}>Page not found</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 2rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link className="button button--primary" to="/">
          Go to dashboard
        </Link>
      </div>
    </PageContainer>
  );
}
