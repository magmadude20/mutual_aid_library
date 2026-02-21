import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LocationPicker from './LocationPicker';
import './Profile.css';

const DEFAULT_LAT = 36.16473;
const DEFAULT_LNG = -86.774204;

function Profile({ user }) {
  const [fullName, setFullName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        setMessage('');
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name, contact_info, latitude, longitude')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setFullName(data?.full_name ?? '');
        setContactInfo(data?.contact_info ?? '');
        if (data?.latitude != null && data?.longitude != null && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load profile.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user.id]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage('');
    try {
      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName.trim() || null,
        contact_info: contactInfo.trim() ?? '',
        latitude: latitude,
        longitude: longitude,
      });
      if (upsertError) throw upsertError;
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-section" aria-label="Profile">
      <div className="profile-card">
        <h2 className="profile-title">Profile</h2>
        <p className="profile-subtitle">Signed in as {user.email}</p>
        {loading ? (
          <p className="status">Loading profile…</p>
        ) : (
          <form onSubmit={handleSave}>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && <p className="profile-message">{message}</p>}
            <label className="form-label" htmlFor="full-name">
              Display name
            </label>
            <input
              id="full-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              disabled={saving}
              autoComplete="name"
            />
            <label className="form-label" htmlFor="contact-info">
              Contact info
            </label>
            <p className="form-hint">
              How others can reach you (phone, email, <a href="https://signal.org/blog/phone-number-privacy-usernames/" target="_blank" rel="noopener noreferrer">signal username</a>, etc.)
              </p>
            <textarea
              id="contact-info"
              className="form-input form-textarea"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="How others can reach you"
              rows={3}
              disabled={saving}
            />
            <div className="form-map-section">
              <label className="form-label">Your location</label>
              <p className="form-hint">
                Used to show you on the Thing library map. Click the map to set.
                <br />
                (feel free to pick somewhere near you and not your exact location)
              </p>
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
            <button type="submit" className="submit-button" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default Profile;

