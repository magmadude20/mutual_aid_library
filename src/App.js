import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import Map from './components/Map';
import LocationPicker from './components/LocationPicker';
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
  const [activeTab, setActiveTab] = useState('items'); // 'add' | 'items'
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, latitude, longitude');

        if (fetchError) throw fetchError;
        setItems(data ?? []);
        // If you have rows in DB but see 0 here, check Supabase RLS: Table Editor → items → RLS policies → add "Allow read" for anon
        if ((data?.length ?? 0) === 0) {
          console.log('Supabase returned 0 items. If you have data, add an RLS policy that allows SELECT.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load items.');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

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

  return (
    <div className="App">
      <header className="App-header">
        <h1>Inventory</h1>
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
            Items
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
      </header>
      <main className="App-main">
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
            <strong>Row Level Security (RLS)</strong> in Supabase: Table Editor →{' '}
            <code>items</code> → RLS policies → add a policy that allows{' '}
            <code>SELECT</code> for the anon role.
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
      </main>
    </div>
  );
}

export default App;
