import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useMyThings } from '../hooks/useMyThings';
import { useMyRequests } from '../hooks/useMyRequests';
import Map from './Map';
import LocationPicker from './LocationPicker';
import AddItemModal from './AddItemModal';
import EditGroupSharingModal from './EditGroupSharingModal';
import './GroupDetailPage.css';

const DEFAULT_LAT = 45;
const DEFAULT_LNG = -93;

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
  const [editRequiresApproval, setEditRequiresApproval] = useState(false);
  const [editLatitude, setEditLatitude] = useState(DEFAULT_LAT);
  const [editLongitude, setEditLongitude] = useState(DEFAULT_LNG);
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [locationExpanded, setLocationExpanded] = useState(false);
  const [membersExpanded, setMembersExpanded] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState(null);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sharedThingIds, setSharedThingIds] = useState([]);
  const [sharedThingsLoading, setSharedThingsLoading] = useState(false);
  const [sharedThingsRefresh, setSharedThingsRefresh] = useState(0);
  const [sharedThingsList, setSharedThingsList] = useState([]);
  const [sharedRequestsList, setSharedRequestsList] = useState([]);
  const [sharedItemsLoading, setSharedItemsLoading] = useState(false);
  const [thingsError, setThingsError] = useState(null);
  const [addThingModalOpen, setAddThingModalOpen] = useState(false);
  const [addRequestModalOpen, setAddRequestModalOpen] = useState(false);
  const [editThingsSharingOpen, setEditThingsSharingOpen] = useState(false);
  const [editRequestsSharingOpen, setEditRequestsSharingOpen] = useState(false);
  const [memberMenuOpen, setMemberMenuOpen] = useState(null);
  const [confirmMakeAdmin, setConfirmMakeAdmin] = useState(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState(null);
  const [memberActionSubmitting, setMemberActionSubmitting] = useState(false);
  const [memberActionError, setMemberActionError] = useState(null);
  const memberMenuAnchorRef = useRef(null);
  const { members, setMembers, loading: membersLoading, error: membersError, refetch: refetchMembers } = useGroupMembers(groupId);
  const { myThings, loading: myThingsLoading, error: myThingsError, refetch: refetchMyThings } = useMyThings(user?.id);
  const { myRequests, loading: myRequestsLoading, error: myRequestsError, refetch: refetchMyRequests } = useMyRequests(user?.id);
  const isAdmin = myRole === 'ADMIN';

  useEffect(() => {
    if (!groupId || !user?.id) return;
    let isMounted = true;
    (async () => {
      try {
        const { data: g, error: gError } = await supabase
          .from('groups')
          .select('id, name, description, is_public, requires_approval, invite_token, latitude, longitude')
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

  // Redirect non-members to join page
  useEffect(() => {
    if (!group || loading) return;
    if (!myRole) {
      navigate(`/join/${group.invite_token}`, { replace: true });
    }
  }, [group, myRole, loading, navigate]);

  // Load pending membership request count/list for admins
  useEffect(() => {
    if (!groupId || !isAdmin) return;
    let isMounted = true;
    (async () => {
      try {
        setPendingLoading(true);
        setPendingError(null);
        const { data, error: fetchError } = await supabase
          .from('membership_requests')
          .select('id, user_id, message, created_at')
          .eq('group_id', groupId)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: true });
        if (fetchError) throw fetchError;
        if (!isMounted) return;

        const rows = data ?? [];
        let requestsWithNames = rows;
        if (rows.length > 0) {
          const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            const nameById = {};
            (profiles ?? []).forEach((p) => {
              nameById[p.id] = p.full_name;
            });
            requestsWithNames = rows.map((r) => ({
              ...r,
              user_full_name: nameById[r.user_id] || null,
            }));
          }
        }

        setPendingRequests(requestsWithNames);
        setPendingCount(requestsWithNames.length);
      } catch (err) {
        if (!isMounted) return;
        setPendingError(err.message || 'Failed to load membership requests.');
      } finally {
        if (!isMounted) return;
        setPendingLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [groupId, isAdmin]);

  async function handleApproveRequest(id) {
    try {
      await supabase.rpc('approve_membership_request', { p_request_id: id });
      // Refresh list
      const { data } = await supabase
        .from('membership_requests')
        .select('id, user_id, message, created_at')
        .eq('group_id', groupId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true });
      const rows = data ?? [];
      let requestsWithNames = rows;
      if (rows.length > 0) {
        const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          const nameById = {};
          (profiles ?? []).forEach((p) => {
            nameById[p.id] = p.full_name;
          });
          requestsWithNames = rows.map((r) => ({
            ...r,
            user_full_name: nameById[r.user_id] || null,
          }));
        }
      }
      setPendingRequests(requestsWithNames);
      setPendingCount(requestsWithNames.length);
    } catch (err) {
      setPendingError(err.message || 'Failed to approve request.');
    }
  }

  async function handleDenyRequest(id) {
    try {
      await supabase.rpc('deny_membership_request', { p_request_id: id });
      const { data } = await supabase
        .from('membership_requests')
        .select('id, user_id, message, created_at')
        .eq('group_id', groupId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true });
      const rows = data ?? [];
      let requestsWithNames = rows;
      if (rows.length > 0) {
        const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          const nameById = {};
          (profiles ?? []).forEach((p) => {
            nameById[p.id] = p.full_name;
          });
          requestsWithNames = rows.map((r) => ({
            ...r,
            user_full_name: nameById[r.user_id] || null,
          }));
        }
      }
      setPendingRequests(requestsWithNames);
      setPendingCount(requestsWithNames.length);
    } catch (err) {
      setPendingError(err.message || 'Failed to deny request.');
    }
  }

  // Close member dropdown when clicking outside
  useEffect(() => {
    if (memberMenuOpen == null) return;
    function handleClick(e) {
      if (memberMenuAnchorRef.current && !memberMenuAnchorRef.current.contains(e.target)) {
        setMemberMenuOpen(null);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [memberMenuOpen]);

  async function handleMakeAdminConfirm() {
    if (!confirmMakeAdmin?.userId || !groupId) return;
    setMemberActionError(null);
    setMemberActionSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('group_members')
        .update({ role: 'ADMIN' })
        .eq('group_id', groupId)
        .eq('user_id', confirmMakeAdmin.userId);
      if (updateError) throw updateError;
      setConfirmMakeAdmin(null);
      refetchMembers();
    } catch (err) {
      setMemberActionError(err.message || 'Failed to update role.');
    } finally {
      setMemberActionSubmitting(false);
    }
  }

  async function handleRemoveMemberConfirm() {
    if (!confirmRemoveMember?.userId || !groupId) return;
    setMemberActionError(null);
    setMemberActionSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', confirmRemoveMember.userId);
      if (deleteError) throw deleteError;
      setConfirmRemoveMember(null);
      refetchMembers();
    } catch (err) {
      setMemberActionError(err.message || 'Failed to remove member.');
    } finally {
      setMemberActionSubmitting(false);
    }
  }

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
  }, [groupId, sharedThingsRefresh]);

  useEffect(() => {
    if (!sharedThingIds.length) {
      setSharedThingsList([]);
      setSharedRequestsList([]);
      setSharedItemsLoading(false);
      return;
    }
    let isMounted = true;
    setSharedItemsLoading(true);
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, additional_notes, user_id, type')
          .in('id', sharedThingIds);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const items = data ?? [];
        setSharedThingsList(items.filter((i) => i.type === 'thing'));
        setSharedRequestsList(items.filter((i) => i.type === 'request'));
      } catch {
        if (isMounted) {
          setSharedThingsList([]);
          setSharedRequestsList([]);
        }
      } finally {
        if (isMounted) setSharedItemsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [sharedThingIds]);

  async function copyInviteLink() {
    if (!group?.invite_token) return;
    const url = `${window.location.origin}/join/${group.invite_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
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
    setEditRequiresApproval(group.requires_approval === true);
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
          requires_approval: editRequiresApproval,
          latitude: editLatitude,
          longitude: editLongitude,
        })
        .eq('id', groupId)
        .select('id, name, description, is_public, requires_approval, invite_token, latitude, longitude')
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
      <div className="group-detail-info-box">
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
            <div className="form-checkbox-row">
              <input
                id="group-edit-requires-approval"
                type="checkbox"
                checked={editRequiresApproval}
                onChange={(e) => setEditRequiresApproval(e.target.checked)}
                disabled={editSubmitting}
              />
              <label className="form-label" htmlFor="group-edit-requires-approval">
                Require admin approval to join
              </label>
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
            <div className="group-detail-title-row">
              <h2 className="group-detail-name">{group.name}</h2>
              <div className="group-detail-header-buttons">
                <button type="button" className="header-button" onClick={handleLeave}>
                  Leave group
                </button>
              </div>
            </div>
            {group.description && <p className="group-detail-description">{group.description}</p>}
          </>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="group-detail-members" aria-label="Members">
        <button
          type="button"
          className="group-detail-members-toggle"
          onClick={() => setMembersExpanded((v) => !v)}
          aria-expanded={membersExpanded}
          aria-controls="group-detail-members-content"
        >
          <span className="group-detail-members-toggle-icon" aria-hidden="true">
            {membersExpanded ? '▼' : '▶'}
          </span>
          <h3 className="map-section-title group-detail-members-toggle-title">
            {membersLoading ? '…' : members.length} users
          </h3>
        </button>
        <div
          id="group-detail-members-content"
          className="group-detail-members-content"
          hidden={!membersExpanded}
        >
          {membersLoading && <p className="status">Loading members…</p>}
          {membersError && <p className="status error">{membersError}</p>}
          {!membersLoading && !membersError && (
            <ul className="group-members-list">
              {members.map((m) => (
                <li key={m.user_id} className="group-members-list-item">
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
                  <div className="member-row-right">
                    <span className="member-role">{m.role}</span>
                    {isAdmin && m.user_id !== user?.id && (
                      <div
                        className="member-menu-wrapper"
                        ref={memberMenuOpen === m.user_id ? memberMenuAnchorRef : null}
                      >
                        <button
                          type="button"
                          className="member-menu-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemberMenuOpen(memberMenuOpen === m.user_id ? null : m.user_id);
                          }}
                          aria-expanded={memberMenuOpen === m.user_id}
                          aria-haspopup="true"
                          aria-label={`Actions for ${m.full_name || 'member'}`}
                        >
                          ⋮
                        </button>
                        {memberMenuOpen === m.user_id && (
                          <div className="member-menu-dropdown" role="menu">
                            {m.role !== 'ADMIN' && (
                              <button
                                type="button"
                                role="menuitem"
                                className="member-menu-item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmMakeAdmin({ userId: m.user_id, fullName: m.full_name || 'this user' });
                                  setMemberMenuOpen(null);
                                }}
                              >
                                Make admin
                              </button>
                            )}
                            <button
                              type="button"
                              role="menuitem"
                              className="member-menu-item member-menu-item-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmRemoveMember({ userId: m.user_id, fullName: m.full_name || 'this user' });
                                setMemberMenuOpen(null);
                              }}
                            >
                              Remove from group
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {group.latitude != null && group.longitude != null && Number.isFinite(group.latitude) && Number.isFinite(group.longitude) && !editingGroup && (
        <section className="group-detail-location" aria-label="Location">
          <button
            type="button"
            className="group-detail-location-toggle"
            onClick={() => setLocationExpanded((v) => !v)}
            aria-expanded={locationExpanded}
            aria-controls="group-detail-location-content"
          >
            <span className="group-detail-location-toggle-icon" aria-hidden="true">
              {locationExpanded ? '▼' : '▶'}
            </span>
            <h3 className="map-section-title group-detail-location-toggle-title">Location</h3>
          </button>
          <div
            id="group-detail-location-content"
            className="group-detail-location-content"
            hidden={!locationExpanded}
          >
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
          </div>
        </section>
      )}

      <section className="group-detail-invite" aria-label="Invite link">
        <button type="button" className="header-button" onClick={copyInviteLink}>
          {inviteCopied ? 'Copied!' : 'Copy invite link'}
        </button>
        <p className="group-invite-hint">Anyone with this link can join.</p>
      </section>

      {isAdmin && !editingGroup && (
        <div className="group-detail-admin-actions-box">
          <p className="group-detail-admin-actions-label">Admin actions</p>
          <div className="group-detail-admin-actions">
            <button type="button" className="header-button" onClick={startEditing}>
              Edit group
            </button>
            <button type="button" className="header-button delete-button" onClick={() => setDeleteConfirmOpen(true)}>
              Delete group
            </button>
          </div>
          <p className="group-detail-admin-actions-label">
            {pendingLoading
              ? 'Checking membership requests…'
              : `${pendingCount} pending membership request${pendingCount === 1 ? '' : 's'}`}
          </p>
          <div className="group-detail-admin-actions">
            <button
              type="button"
              className={pendingCount > 0 ? 'header-button primary-button' : 'header-button'}
              onClick={() => setPendingModalOpen(true)}
              disabled={pendingLoading}
            >
              {pendingLoading ? 'Loading requests…' : 'Review membership requests'}
            </button>
          </div>
        </div>
      )}
      </div>

      <section className="group-detail-your-sharing" aria-label="Your sharing">
        {myThingsError && <p className="status error">{myThingsError}</p>}
        {myRequestsError && <p className="status error">{myRequestsError}</p>}
        {thingsError && <p className="status error" role="alert">{thingsError}</p>}
        <div className="group-detail-sharing-block">
          <h4 className="group-detail-sharing-subtitle">
            You're sharing {myThingsLoading ? '…' : myThings.filter((t) => sharedThingIds.includes(t.id)).length}/
            {myThingsLoading ? '…' : myThings.length} things
          </h4>
          <div className="group-detail-sharing-actions">
            <button
              type="button"
              className="header-button"
              onClick={() => user?.id && setAddThingModalOpen(true)}
              disabled={!user?.id}
            >
              + Add new thing
            </button>
            <button
              type="button"
              className="header-button"
              onClick={() => user?.id && setEditThingsSharingOpen(true)}
              disabled={!user?.id}
            >
              View/edit shared things
            </button>
          </div>
        </div>
        <div className="group-detail-sharing-block">
          <h4 className="group-detail-sharing-subtitle">
            You're sharing {myRequestsLoading ? '…' : myRequests.filter((r) => sharedThingIds.includes(r.id)).length}/
            {myRequestsLoading ? '…' : myRequests.length} requests
          </h4>
          <div className="group-detail-sharing-actions">
            <button
              type="button"
              className="header-button"
              onClick={() => user?.id && setAddRequestModalOpen(true)}
              disabled={!user?.id}
            >
              + Add new request
            </button>
            <button
              type="button"
              className="header-button"
              onClick={() => user?.id && setEditRequestsSharingOpen(true)}
              disabled={!user?.id}
            >
              View/edit shared requests
            </button>
          </div>
        </div>
      </section>

      <section className="group-detail-shared-things" aria-label="Things shared in group">
        <h3 className="map-section-title">
          {sharedItemsLoading || sharedThingsLoading ? '…' : sharedThingsList.length} Things
        </h3>
        {sharedItemsLoading && sharedThingIds.length > 0 && <p className="status">Loading things…</p>}
        {!sharedItemsLoading && sharedThingsList.length === 0 && (
          <p className="status">No things shared with this group yet.</p>
        )}
        {!sharedItemsLoading && sharedThingsList.length > 0 && (
          <ul className="things-list group-detail-shared-list" aria-label="Things">
            {sharedThingsList.map((thing) => (
              <li key={thing.id}>
                <button
                  type="button"
                  className="thing-card thing-card-clickable"
                  onClick={() => navigate(`/thing/${thing.id}`, { state: { thing } })}
                >
                  <div className="thing-card-title-row">
                    <div className="thing-name">{thing.name}</div>
                    {user?.id && thing.user_id === user.id && (
                      <span className="item-yours-badge" aria-label="Your item">Yours</span>
                    )}
                  </div>
                  {thing.description && (
                    <div className="thing-description">{thing.description}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="group-detail-shared-requests" aria-label="Requests shared in group">
        <h3 className="map-section-title">
          {sharedItemsLoading || sharedThingsLoading ? '…' : sharedRequestsList.length} Requests
        </h3>
        {sharedItemsLoading && sharedThingIds.length > 0 && <p className="status">Loading requests…</p>}
        {!sharedItemsLoading && sharedRequestsList.length === 0 && (
          <p className="status">No requests shared with this group yet.</p>
        )}
        {!sharedItemsLoading && sharedRequestsList.length > 0 && (
          <ul className="things-list group-detail-shared-list" aria-label="Requests">
            {sharedRequestsList.map((request) => (
              <li key={request.id}>
                <button
                  type="button"
                  className="thing-card thing-card-clickable"
                  onClick={() => navigate(`/thing/${request.id}`, { state: { thing: request } })}
                >
                  <div className="thing-card-title-row">
                    <div className="thing-name">{request.name}</div>
                    {user?.id && request.user_id === user.id && (
                      <span className="item-yours-badge" aria-label="Your item">Yours</span>
                    )}
                  </div>
                  {request.description && (
                    <div className="thing-description">{request.description}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {addThingModalOpen && (
        <AddItemModal
          type="thing"
          userId={user?.id}
          onSuccess={() => {
            refetchMyThings();
            setSharedThingsRefresh((r) => r + 1);
            setAddThingModalOpen(false);
          }}
          onClose={() => setAddThingModalOpen(false)}
        />
      )}
      {addRequestModalOpen && (
        <AddItemModal
          type="request"
          userId={user?.id}
          onSuccess={() => {
            refetchMyRequests();
            setSharedThingsRefresh((r) => r + 1);
            setAddRequestModalOpen(false);
          }}
          onClose={() => setAddRequestModalOpen(false)}
        />
      )}

      {editThingsSharingOpen && (
        <EditGroupSharingModal
          type="thing"
          items={myThings}
          sharedThingIds={sharedThingIds}
          groupId={groupId}
          onSave={() => setSharedThingsRefresh((r) => r + 1)}
          onClose={() => setEditThingsSharingOpen(false)}
        />
      )}
      {editRequestsSharingOpen && (
        <EditGroupSharingModal
          type="request"
          items={myRequests}
          sharedThingIds={sharedThingIds}
          groupId={groupId}
          onSave={() => setSharedThingsRefresh((r) => r + 1)}
          onClose={() => setEditRequestsSharingOpen(false)}
        />
      )}

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

      {confirmMakeAdmin && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="make-admin-modal-title"
        >
          <div className="modal-card">
            <h3 id="make-admin-modal-title" className="modal-title">
              Make {confirmMakeAdmin.fullName} an admin?
            </h3>
            <p className="modal-text">
              Admins can edit the group, review membership requests, and manage members.
            </p>
            {memberActionError && (
              <p className="form-error modal-error" role="alert">{memberActionError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="header-button"
                onClick={() => {
                  setConfirmMakeAdmin(null);
                  setMemberActionError(null);
                }}
                disabled={memberActionSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleMakeAdminConfirm}
                disabled={memberActionSubmitting}
              >
                {memberActionSubmitting ? 'Updating…' : 'Make admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemoveMember && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-member-modal-title"
        >
          <div className="modal-card">
            <h3 id="remove-member-modal-title" className="modal-title">
              Remove {confirmRemoveMember.fullName} from the group?
            </h3>
            <p className="modal-text">
              They will lose access to the group and can request to join again if the group allows it.
            </p>
            {memberActionError && (
              <p className="form-error modal-error" role="alert">{memberActionError}</p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="header-button"
                onClick={() => {
                  setConfirmRemoveMember(null);
                  setMemberActionError(null);
                }}
                disabled={memberActionSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-delete-button"
                onClick={handleRemoveMemberConfirm}
                disabled={memberActionSubmitting}
              >
                {memberActionSubmitting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingModalOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-requests-modal-title"
        >
          <div className="modal-card">
            <h3 id="pending-requests-modal-title" className="modal-title">
              Review membership requests
            </h3>
            {pendingError && (
              <p className="form-error modal-error" role="alert">
                {pendingError}
              </p>
            )}
            {pendingLoading ? (
              <p className="status">Loading…</p>
            ) : pendingRequests.length === 0 ? (
              <p className="status">No pending membership requests.</p>
            ) : (
              <ul className="pending-requests-list">
                {pendingRequests.map((r) => (
                  <li key={r.id} className="pending-request-item">
                    <div className="pending-request-main">
                      <button
                        type="button"
                        className="member-name member-name-button"
                        onClick={() => navigate(`/user/${r.user_id}`)}
                      >
                        {r.user_full_name?.trim() || 'View user'}
                      </button>
                      {r.message && <p className="pending-request-message">{r.message}</p>}
                    </div>
                    <div className="pending-request-actions">
                      <button
                        type="button"
                        className="header-button"
                        onClick={() => handleApproveRequest(r.id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="header-button delete-button"
                        onClick={() => handleDenyRequest(r.id)}
                      >
                        Deny
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="header-button"
                onClick={() => setPendingModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupDetailPage;
