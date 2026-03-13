import { useState, useEffect } from 'react';
import { useOwnerGroups } from '../../hooks/useOwnerGroups';
import { deleteItem } from '../../services/itemsService';
import { getSharesForThings, setThingGroups } from '../../services/thingsToGroupsService';
import AddItemModal from './AddItemModal';
import './MyThingsPanel.css';

function MyRequestsPanel({
  user,
  myRequests,
  setMyRequests,
  myRequestsLoading,
  myRequestsError,
  onRequestAdded,
  onSelectRequest,
  canAddRequests = true,
  showTitle = true,
}) {
  const [addModalOpen, setAddModalOpen] = useState(false);
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
        const data = await getSharesForThings(requestIds);
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
        await setThingGroups(requestId, bulkSharingGroupIds);
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
        await deleteItem(requestId);
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
          onClick={() => setAddModalOpen(true)}
          disabled={!canAddRequests}
        >
          + Add new request
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
      {myRequestsLoading && <p className="status">Loading your requests…</p>}
      {myRequestsError && (
        <p className="status error" role="alert">
          {myRequestsError}
        </p>
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
      {!myRequestsLoading && !myRequestsError && myRequests.length === 0 && (
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

      {addModalOpen && (
        <AddItemModal
          type="request"
          userId={user?.id}
          onSuccess={(data) => {
            onRequestAdded?.(data);
            setAddModalOpen(false);
          }}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </div>
  );
}

export default MyRequestsPanel;
