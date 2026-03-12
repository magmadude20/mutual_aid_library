import { Outlet, useLocation, NavLink, Link } from 'react-router-dom';

function Layout({ user, logout }) {
  const location = useLocation();
  const pathname = location.pathname;
  const hideTabs =
    !user || pathname.startsWith('/join/') || pathname.startsWith('/admin');

  return (
    <div className="App">
      <header className="App-header">
        <div className="App-header-top">
          <h1>Mutual Aid Library of Things</h1>
          <div className="App-header-user">
            {user ? (
              <button type="button" className="logout-button" onClick={logout}>
                Log out
              </button>
            ) : (
              <Link to="/login" className="logout-button">
                Sign in
              </Link>
            )}
          </div>
        </div>
        {!hideTabs && (
          <nav className="tabs" role="tablist" aria-label="Sections">
            <NavLink
              to="/things"
              end
              role="tab"
              aria-controls="things-panel"
              id="things-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              Things
            </NavLink>
            <NavLink
              to="/requests"
              end
              role="tab"
              aria-controls="requests-panel"
              id="requests-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              Requests
            </NavLink>
            <NavLink
              to="/groups"
              end
              role="tab"
              aria-controls="groups-panel"
              id="groups-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              Groups
            </NavLink>
            {user?.id && (
              <NavLink
                to={`/user/${user.id}`}
                end
                role="tab"
                aria-controls="profile-panel"
                id="profile-tab"
                className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
              >
                My profile
              </NavLink>
            )}
          </nav>
        )}
      </header>
      <main className="App-main">
        <Outlet />
      </main>
      <footer className="App-footer">
        <Link to="/" className="App-footer-link">About</Link>
        {process.env.REACT_APP_FEEDBACK_EMAIL && (
          <>
            {' · '}
            <a
              href={`mailto:${process.env.REACT_APP_FEEDBACK_EMAIL}`}
              className="App-footer-link"
            >
              Feedback
            </a>
          </>
        )}
        {' · © 2026 Very Serious Business'}
      </footer>
    </div>
  );
}

export default Layout;
