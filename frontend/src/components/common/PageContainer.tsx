import { PropsWithChildren } from 'react';

interface PageContainerProps {
  testId?: string;
  viewport?: boolean;
}

export function PageContainer({
  children,
  testId,
  viewport,
}: PropsWithChildren<PageContainerProps>): JSX.Element {
  const cls = viewport ? 'page-container page-container--viewport' : 'page-container';
  return <div className={cls} data-testid={testId}>{children}</div>;
}
