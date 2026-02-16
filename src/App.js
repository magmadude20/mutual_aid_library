import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Map from './components/Map';
import LocationPicker from './components/LocationPicker';
import Login from './components/Login';
import Profile from './components/Profile';
import './App.css';

const DEFAULT_LAT = 36.16473;
const DEFAULT_LNG = -86.774204;

function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'myitems' | 'add'
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [myItems, setMyItems] = useState([]);
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [myItemsError, setMyItemsError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Auth: load initial session and subscribe to changes
  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      const {
        data: { session: initialSession },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (sessionError) {
        // eslint-disable-next-line no-console
        console.error('Error getting session', sessionError);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setAuthLoading(false);
    }
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Only fetch items once we know auth state and user is present.
  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, latitude, longitude');

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setItems(data ?? []);
        // If you have rows in DB but see 0 here, check Supabase RLS: Table Editor → items → RLS policies → add \"Allow read\" for authenticated
        if ((data?.length ?? 0) === 0) {
          // eslint-disable-next-line no-console
          console.log(
            'Supabase returned 0 items. If you have data, check Row Level Security (RLS) for the authenticated role.'
          );
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load items.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }

    fetchItems();
    return () => {
      isMounted = false;
    };
  }, [session]);

  // Fetch current user's items for "My items" tab
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    async function fetchMyItems() {
      try {
        setMyItemsLoading(true);
        setMyItemsError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, latitude, longitude')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setMyItems(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setMyItemsError(err.message || 'Failed to load your items.');
      } finally {
        if (!isMounted) return;
        setMyItemsLoading(false);
      }
    }
    fetchMyItems();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  async function handleSubmit(e) {
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
        .select('id, name, description, latitude, longitude')
        .single();

      if (insertError) throw insertError;
      setItems((prev) => [data, ...prev]);
      setMyItems((prev) => [data, ...prev]);
      setName('');
      setDescription('');
      setLatitude(DEFAULT_LAT);
      setLongitude(DEFAULT_LNG);
    } catch (err) {
      setFormError(err.message || 'Failed to add item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
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

  return (
    <div className="App">
      <header className="App-header">
        <div className="App-header-top">
          <h1>Inventory</h1>
          <div className="App-header-user">
            <span className="App-header-email">{user?.email}</span>
            <button
              type="button"
              className="header-button"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
        {!showSettings && (
        <nav className="tabs" role="tablist" aria-label="Sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'items'}
            aria-controls="items-panel"
            id="items-tab"
            className={`tab ${activeTab === 'items' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            All items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'myitems'}
            aria-controls="myitems-panel"
            id="myitems-tab"
            className={`tab ${activeTab === 'myitems' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('myitems')}
          >
            My items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'add'}
            aria-controls="add-panel"
            id="add-tab"
            className={`tab ${activeTab === 'add' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('add')}
          >
            Add item
          </button>
        </nav>
        )}
      </header>
      <main className="App-main">
        {showSettings ? (
          <div className="settings-page">
            <button
              type="button"
              className="back-link"
              onClick={() => setShowSettings(false)}
            >
              ← Back to inventory
            </button>
            <Profile user={user} />
          </div>
        ) : (
          <>
        {activeTab === 'myitems' && (
          <div
            id="myitems-panel"
            role="tabpanel"
            aria-labelledby="myitems-tab"
            className="tab-panel"
          >
            <h2 className="tab-panel-title">My items</h2>
            {myItemsLoading && <p className="status">Loading your items…</p>}
            {myItemsError && (
              <p className="status error" role="alert">
                {myItemsError}
              </p>
            )}
            {!myItemsLoading && !myItemsError && myItems.length > 0 && (
              <ul className="items-list" aria-label="My items">
                {myItems.map((item) => (
                  <li key={item.id} className="item-card">
                    <div className="item-name">{item.name}</div>
                    {item.description && (
                      <div className="item-description">{item.description}</div>
                    )}
                    {item.latitude != null && item.longitude != null && (
                      <div className="item-coords">
                        {item.latitude}, {item.longitude}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!myItemsLoading && !myItemsError && myItems.length === 0 && (
              <p className="status">You haven&apos;t added any items yet.</p>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div
            id="add-panel"
            role="tabpanel"
            aria-labelledby="add-tab"
            className="tab-panel"
          >
            <form className="add-item-form" onSubmit={handleSubmit} aria-label="Add item">
              <h2 className="form-title">Add item</h2>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <label className="form-label" htmlFor="item-name">
                Name
              </label>
              <input
                id="item-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
                required
                disabled={submitting}
                autoComplete="off"
              />
              <label className="form-label" htmlFor="item-description">
                Description (optional)
              </label>
              <textarea
                id="item-description"
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                disabled={submitting}
              />
              <div className="form-map-section">
                <label className="form-label">Location (click map to set)</label>
                <div className="location-picker-wrapper">
                  <LocationPicker
                    selectedPoint={{ lat: latitude, lng: longitude }}
                    onSelect={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                  />
                </div>
              </div>
              <button type="submit" className="form-submit" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add item'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'items' && (
          <div
            id="items-panel"
            role="tabpanel"
            aria-labelledby="items-tab"
            className="tab-panel"
          >
            {loading && <p className="status">Loading items…</p>}
            {error && (
              <p className="status error" role="alert">
                {error}
              </p>
            )}
            {!loading && !error && items.length === 0 && (
              <p className="status">
                No items returned. If you have rows in the table, check{' '}
                <strong>Row Level Security (RLS)</strong> in Supabase for authenticated users.
              </p>
            )}
            {!loading && !error && items.length > 0 && (
              <ul className="items-list" aria-label="Inventory items">
                {items.map((item) => (
                  <li key={item.id} className="item-card">
                    <div className="item-name">{item.name}</div>
                    {item.description && (
                      <div className="item-description">{item.description}</div>
                    )}
                    {item.latitude != null && item.longitude != null && (
                      <div className="item-coords">
                        {item.latitude}, {item.longitude}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <section className="map-section" aria-label="Map of items">
              <h2 className="map-section-title">Map</h2>
              <div className="map-wrapper">
                <Map items={items} />
              </div>
            </section>
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
