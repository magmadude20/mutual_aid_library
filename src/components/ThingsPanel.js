import Map from './Map';
import './ThingsPanel.css';

function ThingsPanel({ things, loading, error, onSelectThing }) {
  return (
    <div
      id="things-panel"
      role="tabpanel"
      aria-labelledby="things-tab"
      className="tab-panel"
    >
      {loading && <p className="status">Loading things…</p>}
      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && things.length === 0 && (
        <p className="status">
          No things returned. If you have rows in the table, check{' '}
          <strong>Row Level Security (RLS)</strong> in Supabase for authenticated users.
        </p>
      )}
      {!loading && !error && things.length > 0 && (
        <ul className="things-list" aria-label="Inventory things">
          {things.map((thing) => (
            <li key={thing.id}>
              <button
                type="button"
                className="thing-card thing-card-clickable"
                onClick={() => onSelectThing(thing)}
              >
                <div className="thing-name">{thing.name}</div>
                {thing.description && (
                  <div className="thing-description">{thing.description}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <section className="map-section" aria-label="Map of things">
        <h2 className="map-section-title">Map</h2>
        <div className="map-wrapper">
          <Map things={things} />
        </div>
      </section>
    </div>
  );
}

export default ThingsPanel;
