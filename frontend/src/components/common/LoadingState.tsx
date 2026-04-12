interface LoadingStateProps {
  label?: string;
}

export function LoadingState({
  label = 'Loading data…',
}: LoadingStateProps): JSX.Element {
  return (
    <div className="feedback-state feedback-state--loading" aria-live="polite">
      <h3>{label}</h3>
    </div>
  );
}
