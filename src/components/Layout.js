import { Outlet, useLocation, NavLink } from 'react-router-dom';

function Layout({ user, logout }) {
  const location = useLocation();
  const pathname = location.pathname;
  const hideTabs = pathname === '/settings' || pathname.startsWith('/thing/') || pathname.startsWith('/join/') || pathname.startsWith('/groups/');

  return (
    <div className="App">
      <header className="App-header">
        <div className="App-header-top">
          <h1>Mutual Aid Library of Things</h1>
          <div className="App-header-user">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `header-button${isActive ? ' tab-active' : ''}`
              }
            >
              Settings
            </NavLink>
            <button type="button" className="logout-button" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
        {!hideTabs && (
          <nav className="tabs" role="tablist" aria-label="Sections">
            <NavLink
              to="/"
              end
              role="tab"
              aria-controls="things-panel"
              id="things-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              Thing library
            </NavLink>
            <NavLink
              to="/my-things"
              role="tab"
              aria-controls="mythings-panel"
              id="mythings-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              My things
            </NavLink>
            <NavLink
              to="/groups"
              end
              role="tab"
              aria-controls="groups-panel"
              id="groups-tab"
              className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
            >
              My groups
            </NavLink>
          </nav>
        )}
      </header>
      <main className="App-main">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
