import { useState, useEffect } from 'react';
import { useOwnerGroups } from '../hooks/useOwnerGroups';
import { supabase } from '../lib/supabaseClient';
import './MyThingsPanel.css';

function MyRequestsPanel({
  user,
  myRequests,
  setMyRequests,
  myRequestsLoading,
  myRequestsError,
  showAddForm,
  onShowAddForm,
  addForm,
  onAddSubmit,
  onSelectRequest,
  canAddRequests = true,
  showTitle = true,
}) {
  const {
    name,
    description,
    formError,
    submitting,
    sharingGroupIds,
    onNameChange,
    onDescriptionChange,
    onToggleSharingGroup,
    onCancelAdd,
  } = addForm;

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(null);
  const [bulkSharingGroupIds, setBulkSharingGroupIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState(null);
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false);
  const [sharedCountByRequestId, setSharedCountByRequestId] = useState({});

  const { groups: ownerGroups, loading: ownerGroupsLoading } = useOwnerGroups(user?.id);

  useEffect(() => {
    if (!myRequests?.length) {
      setSharedCountByRequestId({});
      return;
    }
    const requestIds = myRequests.map((r) => r.id);
    let isMounted = true;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('thing_id')
          .in('thing_id', requestIds);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const countBy = (data ?? []).reduce((acc, row) => {
          acc[row.thing_id] = (acc[row.thing_id] ?? 0) + 1;
          return acc;
        }, {});
        setSharedCountByRequestId(countBy);
      } catch {
        if (isMounted) setSharedCountByRequestId({});
      }
    })();
    return () => { isMounted = false; };
  }, [myRequests]);

  function toggleSelected(requestId, e) {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkModal(null);
    setBulkError(null);
  }

  function selectAll() {
    if (myRequests.length === 0) return;
    setSelectedIds(myRequests.map((r) => r.id));
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
      for (const requestId of selectedIds) {
        await supabase.from('things_to_groups').delete().eq('thing_id', requestId);
        if (bulkSharingGroupIds.length > 0) {
          await supabase
            .from('things_to_groups')
            .insert(bulkSharingGroupIds.map((group_id) => ({ thing_id: requestId, group_id })));
        }
      }
      setSharedCountByRequestId((prev) => {
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
      for (const requestId of selectedIds) {
        await supabase.from('items').delete().eq('id', requestId);
      }
      setMyRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
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
      id="myrequests-panel"
      role="tabpanel"
      aria-labelledby="myrequests-tab"
      className="tab-panel"
    >
      <div className="my-things-header">
        {showTitle && <h2 className="tab-panel-title">My requests</h2>}
        <button
          type="button"
          className="header-button my-things-add-button"
          onClick={() => onShowAddForm(!showAddForm)}
          disabled={submitting || !canAddRequests}
        >
          {showAddForm ? 'Cancel' : '+ Add new request'}
        </button>
        {!myRequestsLoading && !myRequestsError && myRequests.length > 0 && (
          <div className="my-things-header-bulk-buttons">
            <button
              type="button"
              className="header-button"
              onClick={selectAll}
              disabled={myRequests.every((r) => selectedIds.includes(r.id))}
              aria-label="Select all"
            >
              Select all
            </button>
            {selectedCount > 0 && (
              <button type="button" className="header-button" onClick={clearSelection}>
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>
      {!canAddRequests && (
        <p className="my-things-profile-warning" role="alert">
          You need to add your name and contact info before adding any requests.
        </p>
      )}
      {myRequestsLoading && <p className="status">Loading your requests…</p>}
      {myRequestsError && (
        <p className="status error" role="alert">
          {myRequestsError}
        </p>
      )}
      {showAddForm && canAddRequests && (
        <div className="my-things-add-form-wrapper">
          <form className="add-thing-form" onSubmit={onAddSubmit} aria-label="Add request">
            <h2 className="form-title">Add request</h2>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <label className="form-label" htmlFor="request-name">
              Name
            </label>
            <input
              id="request-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="What are you looking for?"
              required
              disabled={submitting}
              autoComplete="off"
            />
            <label className="form-label" htmlFor="request-description">
              Description (optional)
            </label>
            <textarea
              id="request-description"
              className="form-input form-textarea"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Description"
              rows={3}
              disabled={submitting}
            />
            <div className="add-thing-form-sharing">
              <p className="add-thing-form-sharing-title">Sharing</p>
              {!ownerGroupsLoading && ownerGroups?.length > 0 && (
                <>
                  <p className="add-thing-form-groups-label">Shared with groups:</p>
                  {ownerGroups.map((g) => (
                    <div key={g.id} className="form-checkbox-row">
                      <input
                        id={`add-request-group-${g.id}`}
                        type="checkbox"
                        checked={sharingGroupIds?.includes(g.id)}
                        onChange={() => onToggleSharingGroup?.(g.id)}
                        disabled={submitting}
                      />
                      <label className="form-label" htmlFor={`add-request-group-${g.id}`}>
                        {g.name}
                      </label>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="add-thing-form-actions">
              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add request'}
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
      {!myRequestsLoading && !myRequestsError && myRequests.length > 0 && (
        <>
          {selectedCount > 0 && (
            <div className="my-things-bulk-toolbar">
              <div className="bulk-toolbar-row">
                <span className="bulk-toolbar-label">{selectedCount} selected</span>
              </div>
              <div className="bulk-toolbar-row">
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
              </div>
            </div>
          )}
          <ul className="things-list" aria-label="My requests">
            {myRequests.map((request) => (
              <li key={request.id} className="thing-list-row">
                <input
                  type="checkbox"
                  className="thing-select-checkbox"
                  checked={selectedIds.includes(request.id)}
                  onChange={(e) => toggleSelected(request.id, e)}
                  aria-label={`Select ${request.name}`}
                />
                <div
                  className="thing-card thing-card-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectRequest(request)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectRequest(request);
                    }
                  }}
                >
                  <div className="thing-card-content">
                    <div className="thing-name">{request.name}</div>
                    {request.description && (
                      <div className="thing-description">{request.description}</div>
                    )}
                    <div className="thing-sharing-summary" aria-label="Sharing">
                      Shared with{' '}
                      {ownerGroups.length === 0
                        ? '0 groups'
                        : `${sharedCountByRequestId[request.id] ?? 0}/${ownerGroups.length} groups`}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {!myRequestsLoading && !myRequestsError && myRequests.length === 0 && !showAddForm && (
        <p className="status">You haven&apos;t added any requests yet.</p>
      )}

      {bulkModal === 'sharing' && (
        <div className="my-things-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-sharing-request-title">
          <div className="my-things-modal-card">
            <h3 id="bulk-sharing-request-title">Edit sharing for {selectedCount} requests</h3>
            <form onSubmit={handleBulkSharingSave}>
              {bulkError && <p className="form-error" role="alert">{bulkError}</p>}
              {!ownerGroupsLoading && ownerGroups.length > 0 && (
                <>
                  <p className="bulk-sharing-groups-label">Shared with groups:</p>
                  {ownerGroups.map((g) => (
                    <div key={g.id} className="form-checkbox-row">
                      <input
                        id={`bulk-share-request-g-${g.id}`}
                        type="checkbox"
                        checked={bulkSharingGroupIds.includes(g.id)}
                        onChange={() => toggleBulkGroup(g.id)}
                        disabled={bulkSaving}
                      />
                      <label className="form-label" htmlFor={`bulk-share-request-g-${g.id}`}>{g.name}</label>
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

      {bulkModal === 'delete' && (
        <div className="my-things-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-request-title">
          <div className="my-things-modal-card">
            <h3 id="bulk-delete-request-title">Delete {selectedCount} requests?</h3>
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

export default MyRequestsPanel;
