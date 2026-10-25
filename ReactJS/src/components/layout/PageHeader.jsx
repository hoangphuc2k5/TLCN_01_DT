export default function PageHeader({ title, description, actions }) {
  return (
    <header className="app-page-header">
      <div className="app-page-header-copy">
        <h1 className="app-page-title">{title}</h1>
        {description ? <p className="app-page-description">{description}</p> : null}
      </div>
      {actions ? (
        <div className="app-page-actions" role="group" aria-label="Thao tác trang">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
