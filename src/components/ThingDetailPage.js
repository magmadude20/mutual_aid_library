import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Owner from './Owner';
import { useOwnerGroups } from '../hooks/useOwnerGroups';
import { useThingGroups } from '../hooks/useThingGroups';
import './ThingDetailPage.css';

function ThingDetailPage({ thing, user, onBack, onThingUpdated, onThingDeleted }) {
  const [editingThing, setEditingThing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const isOwner = thing.user_id === user?.id;
  const { groups: ownerGroups, loading: ownerGroupsLoading } = useOwnerGroups(isOwner ? thing.user_id : null);
  const { groupIds: sharedGroupIds, refetch: refetchThingGroups } = useThingGroups(thing.id);
  const [sharingPublic, setSharingPublic] = useState(thing.is_public !== false);
  const [sharingGroupIds, setSharingGroupIds] = useState([]);
  const [sharingSaving, setSharingSaving] = useState(false);
  const [sharingError, setSharingError] = useState(null);

  useEffect(() => {
    setSharingPublic(thing.is_public !== false);
  }, [thing.is_public]);

  useEffect(() => {
    setSharingGroupIds(sharedGroupIds);
  }, [sharedGroupIds]);

  async function handlePublicChange(checked) {
    setSharingError(null);
    setSharingPublic(checked);
    setSharingSaving(true);
    try {
      const { data, error: updateError } = await supabase
        .from('items')
        .update({ is_public: checked })
        .eq('id', thing.id)
        .select('id, name, description, user_id, is_public')
        .single();
      if (updateError) throw updateError;
      onThingUpdated(data);
    } catch (err) {
      setSharingPublic(thing.is_public !== false);
      setSharingError(err.message || 'Failed to save.');
    } finally {
      setSharingSaving(false);
    }
  }

  async function handleGroupToggle(groupId) {
    const currentlyShared = sharingGroupIds.includes(groupId);
    const previousIds = sharingGroupIds;
    const nextIds = currentlyShared
      ? previousIds.filter((id) => id !== groupId)
      : [...previousIds, groupId];
    setSharingError(null);
    setSharingGroupIds(nextIds);
    setSharingSaving(true);
    try {
      if (currentlyShared) {
        const { error } = await supabase
          .from('things_to_groups')
          .delete()
          .eq('thing_id', thing.id)
          .eq('group_id', groupId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('things_to_groups')
          .insert({ thing_id: thing.id, group_id: groupId });
        if (error) throw error;
      }
      refetchThingGroups(true);
    } catch (err) {
      setSharingGroupIds(previousIds);
      setSharingError(err.message || 'Failed to save.');
    } finally {
      setSharingSaving(false);
    }
  }

  async function handleShareWithAllGroups() {
    if (!ownerGroups?.length) return;
    const toAdd = ownerGroups.filter((g) => !sharingGroupIds.includes(g.id));
    if (toAdd.length === 0) return;
    const previousIds = sharingGroupIds;
    setSharingError(null);
    setSharingGroupIds((prev) => [...prev, ...toAdd.map((g) => g.id)]);
    setSharingSaving(true);
    try {
      const { error } = await supabase.from('things_to_groups').insert(
        toAdd.map((g) => ({ thing_id: thing.id, group_id: g.id }))
      );
      if (error) throw error;
      refetchThingGroups(true);
    } catch (err) {
      setSharingGroupIds(previousIds);
      setSharingError(err.message || 'Failed to share with all groups.');
    } finally {
      setSharingSaving(false);
    }
  }

  function startEditing() {
    setEditName(thing.name ?? '');
    setEditDescription(thing.description ?? '');
    setEditError(null);
    setEditingThing(true);
  }

  function cancelEditing() {
    setEditingThing(false);
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
        .from('items')
        .update({
          name: trimmedName,
          description: editDescription.trim() || null,
        })
        .eq('id', thing.id)
        .select('id, name, description, user_id, is_public')
        .single();

      if (updateError) throw updateError;
      setEditingThing(false);
      onThingUpdated(data);
    } catch (err) {
      setEditError(err.message || 'Failed to update thing.');
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const { error: err } = await supabase
        .from('items')
        .delete()
        .eq('id', thing.id);

      if (err) throw err;
      setDeleteConfirmOpen(false);
      onThingDeleted();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete thing.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  return (
    <div className="thing-detail-page">
      <div className="thing-detail-actions">
        <button
          type="button"
          className="back-link"
          onClick={() => {
            setEditingThing(false);
            setDeleteConfirmOpen(false);
            setDeleteError(null);
            onBack();
          }}
        >
          ← Back
        </button>
        {thing.user_id === user?.id && !editingThing && (
          <div className="thing-detail-buttons">
            <button
              type="button"
              className="header-button"
              onClick={startEditing}
            >
              Edit
            </button>
            <button
              type="button"
              className="header-button delete-button"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <h3 className="map-section-title">Thing</h3>
      <article className="thing-detail" aria-label={`Thing: ${thing.name}`}>
        {editingThing ? (
          <form onSubmit={handleEditSave} className="thing-detail-edit-form">
            {editError && (
              <p className="form-error" role="alert">
                {editError}
              </p>
            )}
            <label className="form-label" htmlFor="edit-thing-name">
              Name
            </label>
            <input
              id="edit-thing-name"
              type="text"
              className="form-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Thing name"
              required
              disabled={editSubmitting}
              autoComplete="off"
            />
            <label className="form-label" htmlFor="edit-thing-description">
              Description (optional)
            </label>
            <textarea
              id="edit-thing-description"
              className="form-input form-textarea"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Description"
              rows={3}
              disabled={editSubmitting}
            />
            <div className="thing-detail-edit-buttons">
              <button
                type="submit"
                className="submit-button"
                disabled={editSubmitting}
              >
                {editSubmitting ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="header-button"
                onClick={cancelEditing}
                disabled={editSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="thing-detail-name">{thing.name}</h2>
            <div className="thing-detail-description-row">
              <span className="thing-detail-prefix">Description</span>
              <span className="thing-detail-description-value">
                {thing.description || '—'}
              </span>
            </div>
          </>
        )}
      </article>
      {isOwner && !editingThing && (
        <section className="thing-detail-sharing" aria-label="Sharing">
          <h3 className="map-section-title">Sharing</h3>
          <div className="thing-sharing-form">
            {sharingError && <p className="form-error" role="alert">{sharingError}</p>}
            <div className="thing-sharing-checkbox-row">
              <input
                id="share-public"
                type="checkbox"
                checked={sharingPublic}
                onChange={(e) => handlePublicChange(e.target.checked)}
                disabled={sharingSaving}
              />
              <label className="form-label" htmlFor="share-public">Public (visible to everyone)</label>
            </div>
            {!ownerGroupsLoading && ownerGroups.length > 0 && (
              <>
                <div className="thing-sharing-groups-header">
                  <p className="thing-sharing-groups-label">Shared with groups:</p>
                  <button
                    type="button"
                    className="header-button thing-share-all-groups-btn"
                    onClick={handleShareWithAllGroups}
                    disabled={
                      sharingSaving ||
                      ownerGroups.every((g) => sharingGroupIds.includes(g.id))
                    }
                  >
                    Share with all groups
                  </button>
                </div>
                {ownerGroups.map((g) => (
                  <div key={g.id} className="thing-sharing-checkbox-row">
                    <input
                      id={`share-group-${g.id}`}
                      type="checkbox"
                      checked={sharingGroupIds.includes(g.id)}
                      onChange={() => handleGroupToggle(g.id)}
                      disabled={sharingSaving}
                    />
                    <label className="form-label" htmlFor={`share-group-${g.id}`}>{g.name}</label>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      )}
      <Owner userId={thing.user_id} />
      {deleteConfirmOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="modal-card">
            <h3 id="delete-modal-title" className="modal-title">
              Delete this thing?
            </h3>
            <p className="modal-text">
              This cannot be undone.
            </p>
            {deleteError && (
              <p className="form-error modal-error" role="alert">
                {deleteError}
              </p>
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

export default ThingDetailPage;
