import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useUserProfile } from '../hooks/useUserProfile';
import { useUserVisibleThings } from '../hooks/useUserVisibleThings';
import Map from './Map';
import LocationPicker from './LocationPicker';
import './UserDetailPage.css';

const DEFAULT_LAT = 36.16473;
const DEFAULT_LNG = -86.774204;

function UserDetailPage({ user }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { fullName, contactInfo, latitude, longitude, loading: profileLoading, error: profileError, refetch: refetchProfile } = useUserProfile(userId);
  const { things, loading: thingsLoading, error: thingsError } = useUserVisibleThings(userId);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editContactInfo, setEditContactInfo] = useState('');
  const [editLatitude, setEditLatitude] = useState(DEFAULT_LAT);
  const [editLongitude, setEditLongitude] = useState(DEFAULT_LNG);
  const [saveError, setSaveError] = useState(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const isSelf = user?.id === userId;

  useEffect(() => {
    if (editingProfile) {
      setEditFullName(fullName ?? '');
      setEditContactInfo(contactInfo ?? '');
      setEditLatitude(latitude != null && Number.isFinite(latitude) ? latitude : DEFAULT_LAT);
      setEditLongitude(longitude != null && Number.isFinite(longitude) ? longitude : DEFAULT_LNG);
      setSaveError(null);
      setSaveMessage('');
    }
  }, [editingProfile, fullName, contactInfo, latitude, longitude]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveMessage('');
    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: editFullName.trim() || null,
        contact_info: editContactInfo.trim() ?? '',
        latitude: editLatitude,
        longitude: editLongitude,
      });
      if (upsertError) throw upsertError;
      setSaveMessage('Profile saved.');
      await refetchProfile();
      setEditingProfile(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const locationMarker =
    latitude != null && longitude != null
      ? [{ userId, latitude, longitude, fullName: fullName || 'Unknown', things: things ?? [] }]
      : [];

  if (profileLoading && !fullName && !profileError) {
    return (
      <div className="App-main">
        <p className="status">Loading…</p>
      </div>
    );
  }

  if (profileError && !fullName) {
    return (
      <div className="App-main">
        <p className="status error" role="alert">{profileError}</p>
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="user-detail-page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <header className="user-detail-header">
        <div className="user-detail-name-row">
          <h2 className="user-detail-name">{fullName || 'Unknown'}</h2>
          {isSelf && (
            <>
              <span className="user-detail-badge">You</span>
              {!editingProfile && (
                <button
                  type="button"
                  className="header-button user-detail-edit-btn"
                  onClick={() => setEditingProfile(true)}
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>
        {isSelf && editingProfile ? (
          <form onSubmit={handleSaveProfile} className="user-detail-edit-form" aria-label="Edit profile">
            {saveError && <p className="form-error" role="alert">{saveError}</p>}
            {saveMessage && <p className="user-detail-save-message">{saveMessage}</p>}
            <label className="form-label" htmlFor="user-edit-name">Display name</label>
            <input
              id="user-edit-name"
              type="text"
              className="form-input"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="Your name"
              disabled={saving}
              autoComplete="name"
            />
            <label className="form-label" htmlFor="user-edit-contact">Contact info</label>
            <p className="form-hint">
              How others can reach you (e.g. <a href="https://signal.org/blog/phone-number-privacy-usernames/" target="_blank" rel="noopener noreferrer">Signal username</a>)
            </p>
            <textarea
              id="user-edit-contact"
              className="form-input form-textarea"
              value={editContactInfo}
              onChange={(e) => setEditContactInfo(e.target.value)}
              placeholder="How others can reach you"
              rows={3}
              disabled={saving}
            />
            <div className="form-map-section">
              <label className="form-label">Your location</label>
              <p className="form-hint">Used to show you on the Thing library map. Click the map to set.</p>
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
            <div className="user-detail-edit-actions">
              <button type="submit" className="submit-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="header-button"
                onClick={() => { setEditingProfile(false); setSaveError(null); }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
        {!editingProfile && contactInfo && (
          <p className="user-detail-contact">
            <span className="user-detail-contact-label">Contact:</span> {contactInfo}
          </p>
        )}
      </header>

      {locationMarker.length > 0 && !editingProfile && (
        <section className="user-detail-location" aria-label="Location">
          <h3 className="map-section-title">Location</h3>
          <div className="map-wrapper user-detail-map">
            <Map markers={locationMarker} />
          </div>
        </section>
      )}

      <section className="user-detail-things" aria-label="Things">
        <h3 className="map-section-title">
          {isSelf ? 'Your things' : "Things you can check out"}
        </h3>
        {thingsLoading && <p className="status">Loading things…</p>}
        {thingsError && <p className="status error" role="alert">{thingsError}</p>}
        {!thingsLoading && !thingsError && things.length === 0 && (
          <p className="status">{isSelf ? "You haven't shared any things yet." : 'No things here.'}</p>
        )}
        {!thingsLoading && !thingsError && things.length > 0 && (
          <ul className="user-detail-things-list" aria-label="Things">
            {things.map((thing) => (
              <li key={thing.id}>
                <button
                  type="button"
                  className="thing-card thing-card-clickable"
                  onClick={() => navigate(`/thing/${thing.id}`, { state: { thing } })}
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
      </section>
    </div>
  );
}

export default UserDetailPage;
