import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function Profile({ user }) {
  const [fullName, setFullName] = useState('');
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
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setFullName(data?.full_name ?? '');
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
              Name
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
            <button type="submit" className="form-submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default Profile;

