import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuth } from './hooks/useAuth';
import { useThings } from './hooks/useThings';
import { useMyThings } from './hooks/useMyThings';
import Login from './components/Login';
import Layout from './components/Layout';
import SettingsPage from './components/SettingsPage';
import ThingDetailRoute from './components/ThingDetailRoute';
import ThingsPanel from './components/ThingsPanel';
import MyThingsPanel from './components/MyThingsPanel';
import './App.css';

const DEFAULT_LAT = 36.16473;
const DEFAULT_LNG = -86.774204;

function App() {
  const { session, user, loading: authLoading, logout } = useAuth();
  const { things, setThings, loading: thingsLoading, error: thingsError } = useThings(session);
  const { myThings, setMyThings, loading: myThingsLoading, error: myThingsError } = useMyThings(user?.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id || location.pathname === '/settings') return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, contact_info')
          .eq('id', user.id)
          .maybeSingle();
        if (!isMounted || error) return;
        const hasName = (data?.full_name ?? '').toString().trim() !== '';
        const hasContact = (data?.contact_info ?? '').toString().trim() !== '';
        if (!hasName || !hasContact) {
          navigate('/settings', { replace: true });
        }
      } catch {
        // ignore; don't redirect on fetch error
      }
    })();
    return () => { isMounted = false; };
  }, [user?.id, location.pathname, navigate]);

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
          name: trimmedName,
          description: description.trim() || null,
          latitude,
          longitude,
        })
        .select('id, name, description, latitude, longitude, user_id')
        .single();

      if (insertError) throw insertError;
      setThings((prev) => [data, ...prev]);
      setMyThings((prev) => [data, ...prev]);
      setName('');
      setDescription('');
      setLatitude(DEFAULT_LAT);
      setLongitude(DEFAULT_LNG);
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

  return (
    <Routes>
      <Route path="/" element={<Layout user={user} logout={logout} />}>
        <Route
          index
          element={
            <ThingsPanel
              things={things}
              loading={thingsLoading}
              error={thingsError}
              onSelectThing={selectThing}
            />
          }
        />
        <Route
          path="my-things"
          element={
            <MyThingsPanel
              myThings={myThings}
              myThingsLoading={myThingsLoading}
              myThingsError={myThingsError}
              showAddForm={showAddForm}
              onShowAddForm={setShowAddForm}
              addForm={{
                name,
                description,
                latitude,
                longitude,
                formError,
                submitting,
                onNameChange: setName,
                onDescriptionChange: setDescription,
                onLocationSelect: (lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                },
                onCancelAdd: () => setShowAddForm(false),
              }}
              onAddSubmit={handleAddSubmit}
              onSelectThing={selectThing}
            />
          }
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
          element={
            <SettingsPage
              user={user}
              onBack={() => navigate('/')}
            />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
