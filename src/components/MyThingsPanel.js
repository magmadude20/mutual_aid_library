import LocationPicker from './LocationPicker';
import './MyThingsPanel.css';

function MyThingsPanel({
  myThings,
  myThingsLoading,
  myThingsError,
  showAddForm,
  onShowAddForm,
  addForm,
  onAddSubmit,
  onSelectThing,
}) {
  const {
    name,
    description,
    latitude,
    longitude,
    formError,
    submitting,
    onNameChange,
    onDescriptionChange,
    onLocationSelect,
    onCancelAdd,
  } = addForm;

  return (
    <div
      id="mythings-panel"
      role="tabpanel"
      aria-labelledby="mythings-tab"
      className="tab-panel"
    >
      <div className="my-things-header">
        <h2 className="tab-panel-title">My things</h2>
        <button
          type="button"
          className="header-button my-things-add-button"
          onClick={() => onShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add new thing'}
        </button>
      </div>
      {myThingsLoading && <p className="status">Loading your things…</p>}
      {myThingsError && (
        <p className="status error" role="alert">
          {myThingsError}
        </p>
      )}
      {showAddForm && (
        <div className="my-things-add-form-wrapper">
          <form className="add-thing-form" onSubmit={onAddSubmit} aria-label="Add thing">
            <h2 className="form-title">Add thing</h2>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <label className="form-label" htmlFor="thing-name">
              Name
            </label>
            <input
              id="thing-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Thing name"
              required
              disabled={submitting}
              autoComplete="off"
            />
            <label className="form-label" htmlFor="thing-description">
              Description (optional)
            </label>
            <textarea
              id="thing-description"
              className="form-input form-textarea"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description"
              rows={3}
              disabled={submitting}
            />
            <div className="form-map-section">
              <label className="form-label">Location (click map to set)</label>
              <div className="location-picker-wrapper">
                <LocationPicker
                  selectedPoint={{ lat: latitude, lng: longitude }}
                  onSelect={onLocationSelect}
                />
              </div>
            </div>
            <div className="add-thing-form-actions">
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add thing'}
              </button>
              <button
                type="button"
                className="header-button"
                onClick={onCancelAdd}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {!myThingsLoading && !myThingsError && myThings.length > 0 && (
        <ul className="things-list" aria-label="My things">
          {myThings.map((thing) => (
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
      {!myThingsLoading && !myThingsError && myThings.length === 0 && !showAddForm && (
        <p className="status">You haven&apos;t added any things yet.</p>
      )}
    </div>
  );
}

export default MyThingsPanel;
