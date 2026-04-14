import { Component, ErrorInfo, ReactNode } from 'react';

import { ErrorState } from './ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  public render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem' }}>
          <ErrorState
            description={this.state.error.message || 'An unexpected error occurred. Please refresh the page.'}
            onRetry={() => this.setState({ error: null })}
            title="Something went wrong"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
