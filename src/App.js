import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { useThings } from './hooks/useThings';
import { useMyThings } from './hooks/useMyThings';
import { useRequests } from './hooks/useRequests';
import { useMyRequests } from './hooks/useMyRequests';
import { useOwnerGroups } from './hooks/useOwnerGroups';
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

  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddRequestForm, setShowAddRequestForm] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addFormSharingGroupIds, setAddFormSharingGroupIds] = useState([]);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [addRequestFormSharingGroupIds, setAddRequestFormSharingGroupIds] = useState([]);
  const [requestFormError, setRequestFormError] = useState(null);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const { groups: ownerGroups } = useOwnerGroups(user?.id);

  async function handleAddSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: trimmedName,
          description: description.trim() || null,
          type: 'thing',
        })
        .select('id, name, description, user_id, type')
        .single();

      if (insertError) throw insertError;
      if (addFormSharingGroupIds.length > 0) {
        const { error: shareError } = await supabase.from('things_to_groups').insert(
          addFormSharingGroupIds.map((group_id) => ({ thing_id: data.id, group_id }))
        );
        if (shareError) throw shareError;
      }
      setThings((prev) => [data, ...prev]);
      setMyThings((prev) => [data, ...prev]);
      setName('');
      setDescription('');
      setAddFormSharingGroupIds([]);
      setShowAddForm(false);
    } catch (err) {
      setFormError(err.message || 'Failed to add thing.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddRequestSubmit(e) {
    e.preventDefault();
    const trimmedName = requestName.trim();
    if (!trimmedName) {
      setRequestFormError('Name is required.');
      return;
    }
    setRequestFormError(null);
    setRequestSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('items')
        .insert({
          user_id: user.id,
          name: trimmedName,
          description: requestDescription.trim() || null,
          type: 'request',
        })
        .select('id, name, description, user_id, type')
        .single();

      if (insertError) throw insertError;
      if (addRequestFormSharingGroupIds.length > 0) {
        const { error: shareError } = await supabase.from('things_to_groups').insert(
          addRequestFormSharingGroupIds.map((group_id) => ({ thing_id: data.id, group_id }))
        );
        if (shareError) throw shareError;
      }
      setRequests((prev) => [data, ...prev]);
      setMyRequests((prev) => [data, ...prev]);
      setRequestName('');
      setRequestDescription('');
      setAddRequestFormSharingGroupIds([]);
      setShowAddRequestForm(false);
    } catch (err) {
      setRequestFormError(err.message || 'Failed to add request.');
    } finally {
      setRequestSubmitting(false);
    }
  }

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
              showAddForm={showAddForm}
              onShowAddForm={(show) => {
                if (show) setAddFormSharingGroupIds(ownerGroups?.map((g) => g.id) ?? []);
                setShowAddForm(show);
              }}
              addForm={{
                name,
                description,
                formError,
                submitting,
                sharingGroupIds: addFormSharingGroupIds,
                onNameChange: setName,
                onDescriptionChange: setDescription,
                onToggleSharingGroup: (groupId) =>
                  setAddFormSharingGroupIds((prev) =>
                    prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
                  ),
                onCancelAdd: () => {
                  setAddFormSharingGroupIds([]);
                  setShowAddForm(false);
                },
              }}
              onAddSubmit={handleAddSubmit}
              showAddRequestForm={showAddRequestForm}
              onShowAddRequestForm={(show) => {
                if (show) setAddRequestFormSharingGroupIds(ownerGroups?.map((g) => g.id) ?? []);
                setShowAddRequestForm(show);
              }}
              addRequestForm={{
                name: requestName,
                description: requestDescription,
                formError: requestFormError,
                submitting: requestSubmitting,
                sharingGroupIds: addRequestFormSharingGroupIds,
                onNameChange: setRequestName,
                onDescriptionChange: setRequestDescription,
                onToggleSharingGroup: (groupId) =>
                  setAddRequestFormSharingGroupIds((prev) =>
                    prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
                  ),
                onCancelAdd: () => {
                  setAddRequestFormSharingGroupIds([]);
                  setShowAddRequestForm(false);
                },
              }}
              onAddRequestSubmit={handleAddRequestSubmit}
              onSelectThing={selectThing}
              onSelectRequest={selectRequest}
            />
          }
        />
        <Route path="admin" element={<AdminPage user={user} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
