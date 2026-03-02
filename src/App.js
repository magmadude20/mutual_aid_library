import { useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useThings } from './hooks/useThings';
import { useMyThings } from './hooks/useMyThings';
import { useRequests } from './hooks/useRequests';
import { useMyRequests } from './hooks/useMyRequests';
import { useMyGroups } from './hooks/useMyGroups';
import Login from './components/Login';
import Layout from './components/Layout';
import ThingDetailRoute from './components/ThingDetailRoute';
import ThingsPanel from './components/ThingsPanel';
import RequestsPanel from './components/RequestsPanel';
import AdminPage from './components/AdminPage';
import NotFoundPage from './components/NotFoundPage';
import JoinGroupPage from './components/JoinGroupPage';
import GroupsListPage from './components/GroupsListPage';
import CreateGroupPage from './components/CreateGroupPage';
import GroupDetailPage from './components/GroupDetailPage';
import UserDetailPage from './components/UserDetailPage';
import './App.css';

function App() {
  const { session, user, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const { things, setThings, loading: thingsLoading, error: thingsError } = useThings(session);
  const { myThings, setMyThings, loading: myThingsLoading, error: myThingsError } = useMyThings(user?.id);
  const { requests, setRequests, loading: requestsLoading, error: requestsError } = useRequests(session);
  const { myRequests, setMyRequests, loading: myRequestsLoading, error: myRequestsError } = useMyRequests(user?.id);

  const navigate = useNavigate();
  const { groups: myGroups, loading: myGroupsLoading } = useMyGroups(user?.id);
  const hasRedirectedNoGroupsToGroups = useRef(false);

  // If user logged in without an invite (not on /join/:token) and has no groups, send them to Groups page once; then they can switch tabs freely
  useEffect(() => {
    if (!user) {
      hasRedirectedNoGroupsToGroups.current = false;
      return;
    }
    if (myGroupsLoading || hasRedirectedNoGroupsToGroups.current) return;
    const path = location.pathname;
    const isJoinPage = path.startsWith('/join/');
    const isGroupsArea = path === '/groups' || path.startsWith('/groups/');
    if (!isJoinPage && !isGroupsArea && myGroups.length === 0) {
      hasRedirectedNoGroupsToGroups.current = true;
      navigate('/groups', { replace: true });
    }
  }, [user, myGroupsLoading, myGroups.length, location.pathname, navigate]);

  if (authLoading) {
    return (
      <div className="App">
        <main className="App-main">
          <p className="status">Checking session…</p>
        </main>
      </div>
    );
  }

  if (!session) {
    // Show 404 for /admin when not logged in; login screen for everything else.
    if (location.pathname.startsWith('/admin')) {
      return (
        <div className="App">
          <main className="App-main">
            <NotFoundPage />
          </main>
        </div>
      );
    }
    return (
      <div className="App">
        <Login />
      </div>
    );
  }

  const selectThing = (thing) => {
    navigate(`/thing/${thing.id}`, { state: { thing } });
  };

  const selectRequest = (request) => {
    navigate(`/thing/${request.id}`, { state: { thing: request } });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <>
      <Routes>
      <Route path="/" element={<Layout user={user} logout={handleLogout} />}>
        <Route
          index
          element={
            <ThingsPanel
              user={user}
              things={things}
              loading={thingsLoading}
              error={thingsError}
              onSelectThing={selectThing}
            />
          }
        />
        <Route
          path="requests"
          element={
            <RequestsPanel
              user={user}
              requests={requests}
              loading={requestsLoading}
              error={requestsError}
              onSelectRequest={selectRequest}
            />
          }
        />
        <Route
          path="my-things"
          element={<Navigate to={user?.id ? `/user/${user.id}` : '/'} replace />}
        />
        <Route
          path="thing/:id"
          element={
            <ThingDetailRoute
              user={user}
              setThings={setThings}
              setMyThings={setMyThings}
              setRequests={setRequests}
              setMyRequests={setMyRequests}
            />
          }
        />
        <Route
          path="settings"
          element={<Navigate to={user?.id ? `/user/${user.id}` : '/'} replace />}
        />
        <Route path="join/:inviteToken" element={<JoinGroupPage user={user} />} />
        <Route path="groups" element={<GroupsListPage user={user} />} />
        <Route path="groups/new" element={<CreateGroupPage user={user} />} />
        <Route path="groups/:groupId" element={<GroupDetailPage user={user} />} />
        <Route
          path="user/:userId"
          element={
            <UserDetailPage
              user={user}
              myThings={myThings}
              setMyThings={setMyThings}
              myThingsLoading={myThingsLoading}
              myThingsError={myThingsError}
              myRequests={myRequests}
              setMyRequests={setMyRequests}
              myRequestsLoading={myRequestsLoading}
              myRequestsError={myRequestsError}
              onSelectThing={selectThing}
              onSelectRequest={selectRequest}
              onThingAdded={(data) => {
                setThings((prev) => [data, ...prev]);
                setMyThings((prev) => [data, ...prev]);
              }}
              onRequestAdded={(data) => {
                setRequests((prev) => [data, ...prev]);
                setMyRequests((prev) => [data, ...prev]);
              }}
            />
          }
        />
        <Route path="admin" element={<AdminPage user={user} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      </Routes>
    </>
  );
}

export default App;
