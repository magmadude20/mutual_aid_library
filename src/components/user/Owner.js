import { Link } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';

function Owner({ userId }) {
  const { fullName, contactInfo, loading } = useUserProfile(userId);

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

