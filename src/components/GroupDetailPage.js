import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useMyThings } from '../hooks/useMyThings';
import { useMyRequests } from '../hooks/useMyRequests';
import Map from './Map';
import LocationPicker from './LocationPicker';
import './GroupDetailPage.css';

const DEFAULT_LAT = 36.16473;
const DEFAULT_LNG = -86.774204;

function GroupDetailPage({ user }) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editLatitude, setEditLatitude] = useState(DEFAULT_LAT);
  const [editLongitude, setEditLongitude] = useState(DEFAULT_LNG);
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [sharedThingIds, setSharedThingIds] = useState([]);
  const [sharedThingsLoading, setSharedThingsLoading] = useState(false);
  const [shareAllBusy, setShareAllBusy] = useState(false);
  const [thingsError, setThingsError] = useState(null);
  const { members, loading: membersLoading, error: membersError } = useGroupMembers(groupId);
  const { myThings, loading: myThingsLoading, error: myThingsError } = useMyThings(user?.id);
  const { myRequests, loading: myRequestsLoading, error: myRequestsError } = useMyRequests(user?.id);

  useEffect(() => {
    if (!groupId || !user?.id) return;
    let isMounted = true;
    (async () => {
      try {
        const { data: g, error: gError } = await supabase
          .from('groups')
          .select('id, name, description, is_public, invite_token, latitude, longitude')
          .eq('id', groupId)
          .maybeSingle();
        if (!isMounted) return;
        if (gError) throw gError;
        if (!g) {
          setGroup(null);
          return;
        }
        const { data: myMember } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!isMounted) return;
        setGroup(g);
        setMyRole(myMember?.role ?? null);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load group.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [groupId, user?.id]);

  useEffect(() => {
    if (!groupId) return;
    let isMounted = true;
    setSharedThingsLoading(true);
    setThingsError(null);
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('thing_id')
          .eq('group_id', groupId);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setSharedThingIds((data ?? []).map((r) => r.thing_id));
      } catch (err) {
        if (!isMounted) return;
        setThingsError(err.message || 'Failed to load sharing.');
      } finally {
        if (isMounted) setSharedThingsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [groupId]);

  async function toggleThingShared(thingId, currentlyShared) {
    setThingsError(null);
    if (currentlyShared) {
      setSharedThingIds((prev) => prev.filter((id) => id !== thingId));
      const { error: delErr } = await supabase
        .from('things_to_groups')
        .delete()
        .eq('thing_id', thingId)
        .eq('group_id', groupId);
      if (delErr) {
        setSharedThingIds((prev) => (prev.includes(thingId) ? prev : [...prev, thingId]));
        setThingsError(delErr.message || 'Failed to update sharing.');
      }
    } else {
      setSharedThingIds((prev) => [...prev, thingId]);
      const { error: insErr } = await supabase
        .from('things_to_groups')
        .insert({ thing_id: thingId, group_id: groupId });
      if (insErr) {
        setSharedThingIds((prev) => prev.filter((id) => id !== thingId));
        setThingsError(insErr.message || 'Failed to update sharing.');
      }
    }
  }

  async function shareAllWithGroup() {
    const toAdd = myThings.filter((t) => !sharedThingIds.includes(t.id));
    if (toAdd.length === 0) return;
    setThingsError(null);
    setShareAllBusy(true);
    const previousIds = sharedThingIds;
    setSharedThingIds((prev) => [...prev, ...toAdd.map((t) => t.id)]);
    try {
      const { error: insErr } = await supabase.from('things_to_groups').insert(
        toAdd.map((t) => ({ thing_id: t.id, group_id: groupId }))
      );
      if (insErr) throw insErr;
    } catch (err) {
      setSharedThingIds(previousIds);
      setThingsError(err.message || 'Failed to share all.');
    } finally {
      setShareAllBusy(false);
    }
  }

  async function shareAllRequestsWithGroup() {
    const toAdd = myRequests.filter((r) => !sharedThingIds.includes(r.id));
    if (toAdd.length === 0) return;
    setThingsError(null);
    setShareAllBusy(true);
    const previousIds = sharedThingIds;
    setSharedThingIds((prev) => [...prev, ...toAdd.map((r) => r.id)]);
    try {
      const { error: insErr } = await supabase.from('things_to_groups').insert(
        toAdd.map((r) => ({ thing_id: r.id, group_id: groupId }))
      );
      if (insErr) throw insErr;
    } catch (err) {
      setSharedThingIds(previousIds);
      setThingsError(err.message || 'Failed to share all requests.');
    } finally {
      setShareAllBusy(false);
    }
  }

  async function copyInviteLink() {
    if (!group?.invite_token) return;
    const url = `${window.location.origin}/join/${group.invite_token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  async function handleLeave() {
    if (!user?.id || !groupId) return;
    try {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
      navigate('/groups', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to leave group.');
    }
  }

  function startEditing() {
    setEditName(group.name ?? '');
    setEditDescription(group.description ?? '');
    setEditIsPublic(group.is_public !== false);
    setEditLatitude(
      group.latitude != null && Number.isFinite(group.latitude) ? group.latitude : DEFAULT_LAT
    );
    setEditLongitude(
      group.longitude != null && Number.isFinite(group.longitude) ? group.longitude : DEFAULT_LNG
    );
    setEditError(null);
    setEditingGroup(true);
  }

  function cancelEditing() {
    setEditingGroup(false);
    setEditError(null);
  }

  async function handleEditSave(e) {
    e.preventDefault();
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Name is required.');
      return;
    }
    setEditError(null);
    setEditSubmitting(true);
    try {
      const { data, error: updateError } = await supabase
        .from('groups')
        .update({
          name: trimmedName,
          description: editDescription.trim() || null,
          is_public: editIsPublic,
          latitude: editLatitude,
          longitude: editLongitude,
        })
        .eq('id', groupId)
        .select('id, name, description, is_public, invite_token, latitude, longitude')
        .single();
      if (updateError) throw updateError;
      setGroup(data);
      setEditingGroup(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update group.');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const { error: deleteErr } = await supabase.from('groups').delete().eq('id', groupId);
      if (deleteErr) throw deleteErr;
      setDeleteConfirmOpen(false);
      navigate('/groups', { replace: true });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete group.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  const isAdmin = myRole === 'ADMIN';

  if (loading) return <div className="App-main"><p className="status">Loading…</p></div>;
  if (error && !group) return <div className="App-main"><p className="status error">{error}</p></div>;
  if (!group) return <div className="App-main"><p className="status error">Group not found.</p></div>;

  return (
    <div className="group-detail-page">
      <button
        type="button"
        className="back-link"
        onClick={() => {
          if (state?.fromAdmin) {
            navigate(-1);
          } else {
            navigate('/groups');
          }
        }}
      >
        ← Back
      </button>
      <div className="group-detail-header">
        {editingGroup ? (
          <form onSubmit={handleEditSave} className="group-edit-form" aria-label="Edit group">
            {editError && <p className="form-error" role="alert">{editError}</p>}
            <label className="form-label" htmlFor="group-edit-name">Name</label>
            <input
              id="group-edit-name"
              type="text"
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
              required
              disabled={editSubmitting}
              autoComplete="off"
            />
            <label className="form-label" htmlFor="group-edit-description">Description (optional)</label>
            <textarea
              id="group-edit-description"
              className="form-input form-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              disabled={editSubmitting}
            />
            <div className="form-checkbox-row">
              <input
                id="group-edit-is-public"
                type="checkbox"
                checked={editIsPublic}
                onChange={(e) => setEditIsPublic(e.target.checked)}
                disabled={editSubmitting}
              />
              <label className="form-label" htmlFor="group-edit-is-public">Public (show in Browse public groups)</label>
            </div>
            <div className="form-map-section">
              <label className="form-label">Group location</label>
              <p className="form-hint">Optional. Click the map to set a location for the group.</p>
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
            <div className="group-edit-actions">
              <button type="button" className="header-button" onClick={cancelEditing} disabled={editSubmitting}>
                Cancel
              </button>
              <button type="submit" className="submit-button" disabled={editSubmitting}>
                {editSubmitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="group-detail-name">{group.name}</h2>
            {group.description && <p className="group-detail-description">{group.description}</p>}
            <p className="group-detail-summary">
              {membersLoading ? '…' : members.length} users sharing {sharedThingsLoading ? '…' : sharedThingIds.length} items
            </p>
            {isAdmin && (
              <div className="group-detail-admin-buttons">
                <button type="button" className="header-button" onClick={startEditing}>
                  Edit group
                </button>
                <button type="button" className="header-button delete-button" onClick={() => setDeleteConfirmOpen(true)}>
                  Delete group
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      {group.latitude != null && group.longitude != null && Number.isFinite(group.latitude) && Number.isFinite(group.longitude) && !editingGroup && (
        <section className="group-detail-location" aria-label="Location">
          <h3 className="map-section-title">Location</h3>
          <div className="map-wrapper group-detail-map">
            <Map
              markers={[
                {
                  groupId: group.id,
                  latitude: group.latitude,
                  longitude: group.longitude,
                  fullName: group.name,
                  href: `/groups/${group.id}`,
                },
              ]}
            />
          </div>
        </section>
      )}

      <section className="group-detail-invite" aria-label="Invite link">
        <h3 className="map-section-title">Invite link</h3>
        <p className="group-invite-hint">Anyone with this link can join.</p>
        <button type="button" className="header-button" onClick={copyInviteLink}>
          Copy invite link
        </button>
      </section>

      <section className="group-detail-members" aria-label="Members">
        <h3 className="map-section-title">Members</h3>
        {membersLoading && <p className="status">Loading members…</p>}
        {membersError && <p className="status error">{membersError}</p>}
        {!membersLoading && !membersError && (
          <ul className="group-members-list">
            {members.map((m) => (
              <li key={m.user_id}>
                <div className="member-main">
                  <button
                    type="button"
                    className="member-name member-name-button"
                    onClick={() => navigate(`/user/${m.user_id}`)}
                  >
                    {m.full_name || '<new user>'}
                  </button>
                  {m.user_id === user?.id && (
                    <span className="member-you-badge">You</span>
                  )}
                </div>
                <span className="member-role">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="group-detail-actions">
        <button type="button" className="header-button" onClick={handleLeave}>
          Leave group
        </button>
      </div>

      <section className="group-detail-your-things" aria-label="Your things in this group">
        <h3 className="map-section-title">Your things</h3>
        <p className="group-things-hint">Share items with this group so members can see them.</p>
        {myThingsLoading && <p className="status">Loading your things…</p>}
        {myThingsError && <p className="status error">{myThingsError}</p>}
        {thingsError && <p className="status error" role="alert">{thingsError}</p>}
        {!myThingsLoading && !myThingsError && (
          <>
            {myThings.length > 0 && (
              <div className="group-detail-share-all-row">
                <button
                  type="button"
                  className="header-button"
                  onClick={shareAllWithGroup}
                  disabled={shareAllBusy || sharedThingsLoading || myThings.every((t) => sharedThingIds.includes(t.id))}
                >
                  {shareAllBusy ? 'Sharing…' : 'Share all'}
                </button>
              </div>
            )}
            {sharedThingsLoading && myThings.length > 0 && <p className="status">Loading sharing…</p>}
            {!sharedThingsLoading && (
              <ul className="group-detail-things-list">
                {myThings.map((thing) => (
                  <li key={thing.id} className="group-detail-thing-row">
                    <input
                      type="checkbox"
                      id={`group-thing-${thing.id}`}
                      className="group-detail-thing-checkbox"
                      checked={sharedThingIds.includes(thing.id)}
                      onChange={() => toggleThingShared(thing.id, sharedThingIds.includes(thing.id))}
                      disabled={sharedThingsLoading}
                      aria-label={`Share "${thing.name ?? 'Untitled'}" with group`}
                    />
                    <label htmlFor={`group-thing-${thing.id}`} className="group-detail-thing-label">
                      {thing.name || 'Untitled'}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {!myThingsLoading && myThings.length === 0 && (
              <p className="status">You have no things yet. Add items from the map or My things.</p>
            )}
          </>
        )}
      </section>

      <section className="group-detail-your-things" aria-label="Your requests in this group">
        <h3 className="map-section-title">Your requests</h3>
        <p className="group-things-hint">Share your requests with this group so members can see them.</p>
        {myRequestsLoading && <p className="status">Loading your requests…</p>}
        {myRequestsError && <p className="status error">{myRequestsError}</p>}
        {thingsError && <p className="status error" role="alert">{thingsError}</p>}
        {!myRequestsLoading && !myRequestsError && (
          <>
            {myRequests.length > 0 && (
              <div className="group-detail-share-all-row">
                <button
                  type="button"
                  className="header-button"
                  onClick={shareAllRequestsWithGroup}
                  disabled={
                    shareAllBusy ||
                    sharedThingsLoading ||
                    myRequests.every((r) => sharedThingIds.includes(r.id))
                  }
                >
                  {shareAllBusy ? 'Sharing…' : 'Share all requests'}
                </button>
              </div>
            )}
            {sharedThingsLoading && myRequests.length > 0 && <p className="status">Loading sharing…</p>}
            {!sharedThingsLoading && (
              <ul className="group-detail-things-list">
                {myRequests.map((request) => (
                  <li key={request.id} className="group-detail-thing-row">
                    <input
                      type="checkbox"
                      id={`group-request-${request.id}`}
                      className="group-detail-thing-checkbox"
                      checked={sharedThingIds.includes(request.id)}
                      onChange={() => toggleThingShared(request.id, sharedThingIds.includes(request.id))}
                      disabled={sharedThingsLoading}
                      aria-label={`Share request "${request.name ?? 'Untitled'}" with group`}
                    />
                    <label htmlFor={`group-request-${request.id}`} className="group-detail-thing-label">
                      {request.name || 'Untitled'}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {!myRequestsLoading && myRequests.length === 0 && (
              <p className="status">You have no requests yet.</p>
            )}
          </>
        )}
      </section>

      {deleteConfirmOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-group-modal-title"
        >
          <div className="modal-card">
            <h3 id="delete-group-modal-title" className="modal-title">
              Delete this group?
            </h3>
            <p className="modal-text">
              All members will be removed and the group cannot be recovered.
            </p>
            {deleteError && (
              <p className="form-error modal-error" role="alert">{deleteError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="header-button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteError(null);
                }}
                disabled={deleteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-delete-button"
                onClick={handleDeleteConfirm}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetailPage;
