import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useMyGroups } from '../hooks/useMyGroups';
import { usePublicGroups } from '../hooks/usePublicGroups';
import { useGroupCounts } from '../hooks/useGroupCounts';
import Map from './Map';
import './GroupsListPage.css';

function GroupsListPage({ user }) {
  const navigate = useNavigate();
  const { groups, loading, error } = useMyGroups(user?.id);
  const { publicGroups, loading: publicLoading, error: publicError } = usePublicGroups(user?.id);
  const allGroupIds = useMemo(
    () => [...groups.map((g) => g.id), ...publicGroups.map((g) => g.id)],
    [groups, publicGroups]
  );
  const { memberCountByGroupId, thingCountByGroupId } = useGroupCounts(allGroupIds);
  const [joiningId, setJoiningId] = useState(null);
  const [joinError, setJoinError] = useState(null);

  async function handleJoinPublic(inviteToken, groupId) {
    setJoiningId(groupId);
    setJoinError(null);
    try {
      await supabase.rpc('join_group_by_token', { invite_token_param: inviteToken });
      navigate(`/groups/${groupId}`, { replace: true });
    } catch (err) {
      setJoinError(err.message || 'Failed to join.');
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="groups-list-page">
      <div className="groups-list-header">
        <h2 className="tab-panel-title">My groups</h2>
        <Link to="/groups/new" className="submit-button groups-new-button">
          Create group
        </Link>
      </div>
      {loading && <p className="status">Loading your groups…</p>}
      {error && <p className="status error" role="alert">{error}</p>}
      {!loading && !error && groups.length === 0 && (
        <p className="status">You're not in any groups yet. Create one or browse public groups below.</p>
      )}
      {!loading && !error && groups.length > 0 && (
        <ul className="groups-list" aria-label="My groups">
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/groups/${g.id}`} className="group-card group-card-link">
                <span className="group-name">{g.name}</span>
                {g.description && <span className="group-description">{g.description}</span>}
                <span className="group-card-summary">
                  {memberCountByGroupId[g.id] ?? 0} users sharing {thingCountByGroupId[g.id] ?? 0} items
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="groups-browse-section" aria-label="Browse public groups">
        <h3 className="groups-browse-title">Browse public groups</h3>
        {publicGroups.some((g) => g.latitude != null && g.longitude != null && Number.isFinite(g.latitude) && Number.isFinite(g.longitude)) && (
          <div className="groups-browse-map-wrapper">
            <Map
              markers={publicGroups
                .filter((g) => g.latitude != null && g.longitude != null && Number.isFinite(g.latitude) && Number.isFinite(g.longitude))
                .map((g) => ({
                  groupId: g.id,
                  latitude: g.latitude,
                  longitude: g.longitude,
                  fullName: g.name,
                  href: `/groups/${g.id}`,
                }))}
            />
          </div>
        )}
        {joinError && <p className="form-error" role="alert">{joinError}</p>}
        {publicLoading && <p className="status">Loading public groups…</p>}
        {!publicLoading && publicError && <p className="status error">{publicError}</p>}
        {!publicLoading && !publicError && publicGroups.length === 0 && (
          <p className="status">No public groups right now.</p>
        )}
        {!publicLoading && !publicError && publicGroups.length > 0 && (
          <ul className="groups-list">
            {publicGroups.map((g) => (
              <li key={g.id}>
                <div className="group-card">
                  <span className="group-name">{g.name}</span>
                  {g.description && <span className="group-description">{g.description}</span>}
                  <span className="group-card-summary">
                    {memberCountByGroupId[g.id] ?? 0} users sharing {thingCountByGroupId[g.id] ?? 0} items
                  </span>
                </div>
                <button
                  type="button"
                  className="submit-button"
                  onClick={() => handleJoinPublic(g.invite_token, g.id)}
                  disabled={joiningId === g.id}
                >
                  {joiningId === g.id ? 'Joining…' : 'Join'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default GroupsListPage;
