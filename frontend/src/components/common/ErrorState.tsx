interface ErrorStateProps {
  description: string;
  title?: string;
}

export function ErrorState({
  description,
  title = 'Something went wrong',
}: ErrorStateProps): JSX.Element {
  return (
    <div className="feedback-state feedback-state--error">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
