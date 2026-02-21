import { useState, useEffect } from 'react';
import { useOwnerGroups } from '../hooks/useOwnerGroups';
import { supabase } from '../lib/supabaseClient';
import './MyThingsPanel.css';

function MyThingsPanel({
  user,
  myThings,
  setMyThings,
  myThingsLoading,
  myThingsError,
  showAddForm,
  onShowAddForm,
  addForm,
  onAddSubmit,
  onSelectThing,
}) {
  const {
    name,
    description,
    formError,
    submitting,
    isPublic,
    sharingGroupIds,
    onNameChange,
    onDescriptionChange,
    onIsPublicChange,
    onToggleSharingGroup,
    onCancelAdd,
  } = addForm;

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(null); // 'sharing' | 'delete'
  const [bulkSharingPublic, setBulkSharingPublic] = useState(true);
  const [bulkSharingGroupIds, setBulkSharingGroupIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false);
  const [sharedCountByThingId, setSharedCountByThingId] = useState({});

  const { groups: ownerGroups, loading: ownerGroupsLoading } = useOwnerGroups(user?.id);

  useEffect(() => {
    if (!myThings?.length) {
      setSharedCountByThingId({});
      return;
    }
    const thingIds = myThings.map((t) => t.id);
    let isMounted = true;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('thing_id')
          .in('thing_id', thingIds);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const countBy = (data ?? []).reduce((acc, row) => {
          acc[row.thing_id] = (acc[row.thing_id] ?? 0) + 1;
          return acc;
        }, {});
        setSharedCountByThingId(countBy);
      } catch {
        if (isMounted) setSharedCountByThingId({});
      }
    })();
    return () => { isMounted = false; };
  }, [myThings]);

  function toggleSelected(thingId, e) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(thingId) ? prev.filter((id) => id !== thingId) : [...prev, thingId]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkModal(null);
    setBulkError(null);
  }

  function selectAll() {
    if (myThings.length === 0) return;
    setSelectedIds(myThings.map((t) => t.id));
  }

  function openBulkAction(action) {
    setBulkModal(action);
    setBulkError(null);
  }

  async function handleBulkSharingSave(e) {
    e.preventDefault();
    setBulkSaving(true);
    setBulkError(null);
    try {
      for (const thingId of selectedIds) {
        const { error: updateError } = await supabase
          .from('items')
          .update({ is_public: bulkSharingPublic })
          .eq('id', thingId)
          .select('id, name, description, user_id, is_public')
          .single();
        if (updateError) throw updateError;
        await supabase.from('things_to_groups').delete().eq('thing_id', thingId);
        if (bulkSharingGroupIds.length > 0) {
          await supabase
            .from('things_to_groups')
            .insert(bulkSharingGroupIds.map((group_id) => ({ thing_id: thingId, group_id })));
        }
        setMyThings((prev) =>
          prev.map((t) => (t.id === thingId ? { ...t, is_public: bulkSharingPublic } : t))
        );
      }
      setSharedCountByThingId((prev) => {
        const next = { ...prev };
        selectedIds.forEach((id) => {
          next[id] = bulkSharingGroupIds.length;
        });
        return next;
      });
      clearSelection();
    } catch (err) {
      setBulkError(err.message || 'Failed to update sharing.');
    } finally {
      setBulkSaving(false);
    }
  }

  function toggleBulkGroup(groupId) {
    setBulkSharingGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }

  async function handleBulkDeleteConfirm() {
    setBulkError(null);
    setBulkDeleteSubmitting(true);
    try {
      for (const thingId of selectedIds) {
        await supabase.from('items').delete().eq('id', thingId);
      }
      setMyThings((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      setBulkModal(null);
      setSelectedIds([]);
    } catch (err) {
      setBulkError(err.message || 'Failed to delete.');
    } finally {
      setBulkDeleteSubmitting(false);
    }
  }

  const selectedCount = selectedIds.length;

  return (
    <div
      id="mythings-panel"
      role="tabpanel"
      aria-labelledby="mythings-tab"
      className="tab-panel"
    >
      <div className="my-things-header">
        <h2 className="tab-panel-title">My things</h2>
        <button
          type="button"
          className="header-button my-things-add-button"
          onClick={() => onShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add new thing'}
        </button>
      </div>
      {myThingsLoading && <p className="status">Loading your things…</p>}
      {myThingsError && (
        <p className="status error" role="alert">
          {myThingsError}
        </p>
      )}
      {showAddForm && (
        <div className="my-things-add-form-wrapper">
          <form className="add-thing-form" onSubmit={onAddSubmit} aria-label="Add thing">
            <h2 className="form-title">Add thing</h2>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <label className="form-label" htmlFor="thing-name">
              Name
            </label>
            <input
              id="thing-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Thing name"
              required
              disabled={submitting}
              autoComplete="off"
            />
            <label className="form-label" htmlFor="thing-description">
              Description (optional)
            </label>
            <textarea
              id="thing-description"
              className="form-input form-textarea"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description"
              rows={3}
              disabled={submitting}
            />
            <div className="add-thing-form-sharing">
              <p className="add-thing-form-sharing-title">Sharing</p>
              <div className="form-checkbox-row">
                <input
                  id="add-thing-public"
                  type="checkbox"
                  checked={isPublic !== false}
                  onChange={(e) => onIsPublicChange?.(e.target.checked)}
                  disabled={submitting}
                />
                <label className="form-label" htmlFor="add-thing-public">
                  Public (visible to everyone)
                </label>
              </div>
              {!ownerGroupsLoading && ownerGroups?.length > 0 && (
                <>
                  <p className="add-thing-form-groups-label">Shared with groups:</p>
                  {ownerGroups.map((g) => (
                    <div key={g.id} className="form-checkbox-row">
                      <input
                        id={`add-thing-group-${g.id}`}
                        type="checkbox"
                        checked={sharingGroupIds?.includes(g.id)}
                        onChange={() => onToggleSharingGroup?.(g.id)}
                        disabled={submitting}
                      />
                      <label className="form-label" htmlFor={`add-thing-group-${g.id}`}>
                        {g.name}
                      </label>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="add-thing-form-actions">
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add thing'}
              </button>
              <button
                type="button"
                className="header-button"
                onClick={onCancelAdd}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      {selectedCount > 0 && (
        <div className="my-things-bulk-toolbar">
          <span className="bulk-toolbar-label">{selectedCount} selected</span>
          <select
            className="bulk-action-select"
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) openBulkAction(v);
              e.target.value = '';
            }}
            aria-label="Bulk action"
          >
            <option value="">Choose action…</option>
            <option value="sharing">Edit sharing</option>
            <option value="delete">Delete</option>
          </select>
          <button type="button" className="header-button" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}
      {!myThingsLoading && !myThingsError && myThings.length > 0 && (
        <>
          {!myThings.every((t) => selectedIds.includes(t.id)) && (
            <div className="my-things-list-actions">
              <button
                type="button"
                className="header-button"
                onClick={selectAll}
                aria-label="Select all"
              >
                Select all
              </button>
            </div>
          )}
          <ul className="things-list" aria-label="My things">
            {myThings.map((thing) => (
              <li key={thing.id} className="thing-list-row">
                <input
                  type="checkbox"
                  className="thing-select-checkbox"
                  checked={selectedIds.includes(thing.id)}
                  onChange={(e) => toggleSelected(thing.id, e)}
                  aria-label={`Select ${thing.name}`}
                />
                <div
                  className="thing-card thing-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectThing(thing)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectThing(thing);
                    }
                  }}
                >
                  <div className="thing-card-content">
                    <div className="thing-name">{thing.name}</div>
                    {thing.description && (
                      <div className="thing-description">{thing.description}</div>
                    )}
                    <div className="thing-sharing-summary" aria-label="Sharing">
                      {thing.is_public !== false ? 'public' : 'not public'}
                      {', shared with '}
                      {ownerGroups.length === 0
                        ? '0 groups'
                        : `${sharedCountByThingId[thing.id] ?? 0}/${ownerGroups.length} groups`}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {!myThingsLoading && !myThingsError && myThings.length === 0 && !showAddForm && (
        <p className="status">You haven&apos;t added any things yet.</p>
      )}

      {/* Bulk Edit sharing modal */}
      {bulkModal === 'sharing' && (
        <div className="my-things-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-sharing-title">
          <div className="my-things-modal-card">
            <h3 id="bulk-sharing-title">Edit sharing for {selectedCount} things</h3>
            <form onSubmit={handleBulkSharingSave}>
              {bulkError && <p className="form-error" role="alert">{bulkError}</p>}
              <div className="form-checkbox-row">
                <input
                  id="bulk-share-public"
                  type="checkbox"
                  checked={bulkSharingPublic}
                  onChange={(e) => setBulkSharingPublic(e.target.checked)}
                  disabled={bulkSaving}
                />
                <label className="form-label" htmlFor="bulk-share-public">Public (visible to everyone)</label>
              </div>
              {!ownerGroupsLoading && ownerGroups.length > 0 && (
                <>
                  <p className="bulk-sharing-groups-label">Shared with groups:</p>
                  {ownerGroups.map((g) => (
                    <div key={g.id} className="form-checkbox-row">
                      <input
                        id={`bulk-share-g-${g.id}`}
                        type="checkbox"
                        checked={bulkSharingGroupIds.includes(g.id)}
                        onChange={() => toggleBulkGroup(g.id)}
                        disabled={bulkSaving}
                      />
                      <label className="form-label" htmlFor={`bulk-share-g-${g.id}`}>{g.name}</label>
                    </div>
                  ))}
                </>
              )}
              <div className="my-things-modal-actions">
                <button type="button" className="header-button" onClick={clearSelection} disabled={bulkSaving}>
                  Cancel
                </button>
                <button type="submit" className="submit-button" disabled={bulkSaving}>
                  {bulkSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete confirmation */}
      {bulkModal === 'delete' && (
        <div className="my-things-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title">
          <div className="my-things-modal-card">
            <h3 id="bulk-delete-title">Delete {selectedCount} things?</h3>
            <p className="modal-text">This cannot be undone.</p>
            {bulkError && <p className="form-error" role="alert">{bulkError}</p>}
            <div className="my-things-modal-actions">
              <button type="button" className="header-button" onClick={clearSelection} disabled={bulkDeleteSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="modal-delete-button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleteSubmitting}
              >
                {bulkDeleteSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyThingsPanel;
