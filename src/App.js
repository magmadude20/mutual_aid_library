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
  const [selectedItem, setSelectedItem] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLatitude, setEditLatitude] = useState(DEFAULT_LAT);
  const [editLongitude, setEditLongitude] = useState(DEFAULT_LNG);
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
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
          .select('id, name, description, latitude, longitude, user_id');

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
          .select('id, name, description, latitude, longitude, user_id')
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

  // When viewing an item detail, fetch the owner's display name from profiles
  useEffect(() => {
    if (!selectedItem?.user_id) {
      setOwnerName(null);
      return;
    }
    let isMounted = true;
    setOwnerLoading(true);
    setOwnerName(null);
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', selectedItem.user_id)
          .maybeSingle();
        if (!isMounted) return;
        if (fetchError) throw fetchError;
        setOwnerName(data?.full_name?.trim() || null);
      } catch {
        if (!isMounted) return;
        setOwnerName(null);
      } finally {
        if (isMounted) setOwnerLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedItem?.user_id]);

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
        .select('id, name, description, latitude, longitude, user_id')
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

  function switchTab(tab) {
    setSelectedItem(null);
    setOwnerName(null);
    setEditingItem(false);
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    setActiveTab(tab);
  }

  function startEditing() {
    setEditName(selectedItem.name ?? '');
    setEditDescription(selectedItem.description ?? '');
    setEditLatitude(
      selectedItem.latitude != null && Number.isFinite(selectedItem.latitude)
        ? selectedItem.latitude
        : DEFAULT_LAT
    );
    setEditLongitude(
      selectedItem.longitude != null && Number.isFinite(selectedItem.longitude)
        ? selectedItem.longitude
        : DEFAULT_LNG
    );
    setEditError(null);
    setEditingItem(true);
  }

  function cancelEditing() {
    setEditingItem(false);
    setEditError(null);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Name is required.');
      return;
    }
    setEditError(null);
    setEditSubmitting(true);
    try {
      const { data, error: updateError } = await supabase
        .from('items')
        .update({
          name: trimmedName,
          description: editDescription.trim() || null,
          latitude: editLatitude,
          longitude: editLongitude,
        })
        .eq('id', selectedItem.id)
        .select('id, name, description, latitude, longitude, user_id')
        .single();

      if (updateError) throw updateError;
      const updated = data;
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setMyItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setSelectedItem(updated);
      setEditingItem(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update item.');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const { error: err } = await supabase
        .from('items')
        .delete()
        .eq('id', selectedItem.id);

      if (err) throw err;
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setMyItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);
      setOwnerName(null);
      setDeleteConfirmOpen(false);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete item.');
    } finally {
      setDeleteSubmitting(false);
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
            onClick={() => switchTab('items')}
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
            onClick={() => switchTab('myitems')}
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
            onClick={() => switchTab('add')}
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
        ) : selectedItem ? (
          <div className="item-detail-page">
            <div className="item-detail-actions">
              <button
                type="button"
                className="back-link"
                onClick={() => {
                  setSelectedItem(null);
                  setOwnerName(null);
                  setEditingItem(false);
                  setDeleteConfirmOpen(false);
                  setDeleteError(null);
                }}
              >
                ← Back
              </button>
              {selectedItem.user_id === user?.id && !editingItem && (
                <div className="item-detail-buttons">
                  <button
                    type="button"
                    className="header-button"
                    onClick={startEditing}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="header-button delete-button"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <article className="item-detail" aria-label={`Item: ${selectedItem.name}`}>
              {editingItem ? (
                <form onSubmit={handleEditSave} className="item-detail-edit-form">
                  {editError && (
                    <p className="form-error" role="alert">
                      {editError}
                    </p>
                  )}
                  <label className="form-label" htmlFor="edit-item-name">
                    Name
                  </label>
                  <input
                    id="edit-item-name"
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Item name"
                    required
                    disabled={editSubmitting}
                    autoComplete="off"
                  />
                  <label className="form-label" htmlFor="edit-item-description">
                    Description (optional)
                  </label>
                  <textarea
                    id="edit-item-description"
                    className="form-input form-textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description"
                    rows={3}
                    disabled={editSubmitting}
                  />
                  <div className="form-map-section">
                    <label className="form-label">Location (click map to set)</label>
                    <div className="location-picker-wrapper">
                      <LocationPicker
                        selectedPoint={{ lat: editLatitude, lng: editLongitude }}
                        onSelect={(lat, lng) => {
                          setEditLatitude(lat);
                          setEditLongitude(lng);
                        }}
                      />
                    </div>
                  </div>
                  <div className="item-detail-edit-buttons">
                    <button
                      type="button"
                      className="header-button"
                      onClick={cancelEditing}
                      disabled={editSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="form-submit"
                      disabled={editSubmitting}
                    >
                      {editSubmitting ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="item-detail-name">{selectedItem.name}</h2>
                  {selectedItem.description && (
                    <p className="item-detail-description">{selectedItem.description}</p>
                  )}
                  <div className="item-detail-owner">
                    <span className="item-detail-owner-label">Owner: </span>
                    {ownerLoading ? (
                      <span className="item-detail-owner-value">Loading…</span>
                    ) : (
                      <span className="item-detail-owner-value">
                        {ownerName || 'Unknown'}
                      </span>
                    )}
                  </div>
                  {selectedItem.latitude != null &&
                   selectedItem.longitude != null &&
                   Number.isFinite(selectedItem.latitude) &&
                   Number.isFinite(selectedItem.longitude) && (
                    <section className="item-detail-map-section" aria-label="Item location">
                      <h3 className="map-section-title">Location</h3>
                      <div className="map-wrapper item-detail-map">
                        <Map items={[selectedItem]} />
                      </div>
                    </section>
                  )}
                </>
              )}
            </article>
            {deleteConfirmOpen && (
              <div
                className="modal-overlay"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-modal-title"
              >
                <div className="modal-card">
                  <h3 id="delete-modal-title" className="modal-title">
                    Delete this item?
                  </h3>
                  <p className="modal-text">
                    This cannot be undone.
                  </p>
                  {deleteError && (
                    <p className="form-error modal-error" role="alert">
                      {deleteError}
                    </p>
                  )}
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="header-button"
                      onClick={() => { setDeleteConfirmOpen(false); setDeleteError(null); }}
                      disabled={deleteSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="modal-delete-button"
                      onClick={handleDeleteConfirm}
                      disabled={deleteSubmitting}
                    >
                      {deleteSubmitting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                  <li key={item.id}>
                    <button
                      type="button"
                      className="item-card item-card-clickable"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="item-name">{item.name}</div>
                      {item.description && (
                        <div className="item-description">{item.description}</div>
                      )}
                    </button>
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
                  <li key={item.id}>
                    <button
                      type="button"
                      className="item-card item-card-clickable"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="item-name">{item.name}</div>
                      {item.description && (
                        <div className="item-description">{item.description}</div>
                      )}
                    </button>
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
