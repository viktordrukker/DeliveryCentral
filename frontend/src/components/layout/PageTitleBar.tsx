interface PageTitleBarProps {
  description?: string;
  title: string;
}

export function PageTitleBar({
  description,
  title,
}: PageTitleBarProps): JSX.Element {
  return (
    <div className="page-title-bar">
      <div>
        <h1 className="page-title-bar__title">{title}</h1>
      </div>
      {description ? (
        <p className="page-title-bar__description">{description}</p>
      ) : null}
    </div>
  );
}
