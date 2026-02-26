import { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { useThings } from './hooks/useThings';
import { useMyThings } from './hooks/useMyThings';
import { useOwnerGroups } from './hooks/useOwnerGroups';
import Login from './components/Login';
import Layout from './components/Layout';
import ThingDetailRoute from './components/ThingDetailRoute';
import ThingsPanel from './components/ThingsPanel';
import JoinGroupPage from './components/JoinGroupPage';
import GroupsListPage from './components/GroupsListPage';
import CreateGroupPage from './components/CreateGroupPage';
import GroupDetailPage from './components/GroupDetailPage';
import UserDetailPage from './components/UserDetailPage';
import './App.css';

function App() {
  const { session, user, loading: authLoading, logout } = useAuth();
  const { things, setThings, loading: thingsLoading, error: thingsError } = useThings(session);
  const { myThings, setMyThings, loading: myThingsLoading, error: myThingsError } = useMyThings(user?.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [addFormSharingGroupIds, setAddFormSharingGroupIds] = useState([]);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
        })
        .select('id, name, description, user_id')
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
    return (
      <div className="App">
        <Login />
      </div>
    );
  }

  const selectThing = (thing) => {
    navigate(`/thing/${thing.id}`, { state: { thing } });
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
              onSelectThing={selectThing}
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
