import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { supabase } from '../lib/supabaseClient';
import LocationPicker from './LocationPicker';
import './CreateGroupPage.css';

function CreateGroupPage({ user }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError('Location is required. Click the map to set the group location.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const inviteToken = nanoid(21);
      const { data: group, error: insertError } = await supabase
        .from('groups')
        .insert({
          name: trimmedName,
          description: description.trim() || null,
          is_public: isPublic,
          invite_token: inviteToken,
          created_by: user.id,
          latitude,
          longitude,
        })
        .select('id')
        .single();
      if (insertError) throw insertError;
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'ADMIN',
      });
      navigate(`/groups/${group.id}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-group-page">
      <button type="button" className="back-link" onClick={() => navigate('/groups')}>
        ← Back to My groups
      </button>
      <h2 className="tab-panel-title">Create group</h2>
      <form onSubmit={handleSubmit} className="create-group-form" aria-label="Create group">
        {error && <p className="form-error" role="alert">{error}</p>}
        <label className="form-label" htmlFor="group-name">Name</label>
        <input
          id="group-name"
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          required
          disabled={submitting}
          autoComplete="off"
        />
        <label className="form-label" htmlFor="group-description">Description (optional)</label>
        <textarea
          id="group-description"
          className="form-input form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          disabled={submitting}
        />
        <div className="form-map-section">
          <label className="form-label">Location</label>
          <p className="form-hint">Click the map to set the group location (required).</p>
          <div className="location-picker-wrapper">
            <LocationPicker
              selectedPoint={
                latitude != null && longitude != null
                  ? { lat: latitude, lng: longitude }
                  : undefined
              }
              onSelect={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
                setError(null);
              }}
            />
          </div>
        </div>
        <div className="form-checkbox-row">
          <input
            id="group-is-public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={submitting}
          />
          <label className="form-label" htmlFor="group-is-public">
            Public (show in Browse public groups)
          </label>
        </div>
        <div className="create-group-actions">
          <button type="button" className="header-button" onClick={() => navigate('/groups')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="submit-button" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateGroupPage;
