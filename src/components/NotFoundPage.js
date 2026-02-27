import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="not-found-page">
      <h2 className="tab-panel-title">Page not found</h2>
      <p className="status">The page you’re looking for doesn’t exist.</p>
      <Link to="/" className="header-button">
        ← Back to home
      </Link>
    </div>
  );
}

export default NotFoundPage;

