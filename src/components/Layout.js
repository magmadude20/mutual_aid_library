import { Outlet, useLocation, NavLink } from 'react-router-dom';

function Layout({ user, logout }) {
  const location = useLocation();
  const pathname = location.pathname;
  const isOwnProfile = user?.id && pathname === `/user/${user.id}`;
  const hideTabs =
    pathname.startsWith('/join/') ||
    pathname.startsWith('/groups/') ||
    (pathname.startsWith('/user/') && !isOwnProfile);

  return (
    <div className="App">
      <header className="App-header">
        <div className="App-header-top">
          <h1>Mutual Aid Library of Things</h1>
          <div className="App-header-user">
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
    </div>
  );
}

export default Layout;
