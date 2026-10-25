import PageHeader from './PageHeader';

export default function PageShell({ title, description, actions, children }) {
  return (
    <div className="app-page-shell">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="app-page-content">{children}</div>
    </div>
  );
}
