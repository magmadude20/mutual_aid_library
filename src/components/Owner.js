import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function Owner({ userId }) {
  const [fullName, setFullName] = useState(null);
  const [contactInfo, setContactInfo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFullName(null);
      setContactInfo('');
      return;
    }
    let isMounted = true;
    setLoading(true);
    setFullName(null);
    setContactInfo('');
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name, contact_info')
          .eq('id', userId)
          .maybeSingle();
        if (!isMounted) return;
        if (fetchError) throw fetchError;
        setFullName(data?.full_name?.trim() || null);
        setContactInfo(data?.contact_info ?? '');
      } catch {
        if (!isMounted) return;
        setFullName(null);
        setContactInfo('');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <section className="thing-detail-owner-section" aria-label="Owner">
      <h3 className="map-section-title">Owner</h3>
      <div className="owner-box">
        {loading ? (
          <p className="thing-detail-owner-loading">Loading…</p>
        ) : (
          <>
            <p className="owner-row">
              <span className="owner-prefix owner-prefix-name">Name</span>
              <span className="owner-value">{fullName || 'Unknown'}</span>
            </p>
            <p className="owner-row">
              <span className="owner-prefix owner-prefix-contact">Contact info</span>
              <span className="owner-value owner-value-contact">
                {contactInfo || '—'}
              </span>
            </p>
            {userId && (
              <p className="owner-row owner-row-link">
                <Link to={`/user/${userId}`} className="owner-view-profile-link">
                  View all things by this owner
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default Owner;
