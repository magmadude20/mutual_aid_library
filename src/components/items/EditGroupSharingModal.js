import { useState, useEffect } from 'react';
import { addShare, removeShare } from '../../services/thingsToGroupsService';
import './EditGroupSharingModal.css';

/**
 * Modal to edit which of the user's things or requests are shared with a group.
 * @param {'thing' | 'request'} type
 * @param {{ id: string, name: string, description?: string }[]} items - user's things or requests
 * @param {string[]} sharedThingIds - item ids currently shared with the group
 * @param {string} groupId
 * @param {() => void} onSave - called after saving (caller should refetch)
 * @param {() => void} onClose
 */
function EditGroupSharingModal({ type, items = [], sharedThingIds = [], groupId, onSave, onClose }) {
  const [checkedIds, setCheckedIds] = useState(() => 
    items.filter((item) => sharedThingIds.includes(item.id)).map((item) => item.id)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCheckedIds(items.filter((item) => sharedThingIds.includes(item.id)).map((item) => item.id));
  }, [items, sharedThingIds]);

  function toggle(itemId) {
    setCheckedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
    setError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!groupId) return;
    setError(null);
    setSaving(true);
    const initialShared = new Set(items.filter((item) => sharedThingIds.includes(item.id)).map((item) => item.id));
    const nowChecked = new Set(checkedIds);
    try {
      for (const itemId of initialShared) {
        if (!nowChecked.has(itemId)) {
          await removeShare(itemId, groupId);
        }
      }
      for (const itemId of nowChecked) {
        if (!initialShared.has(itemId)) {
          await addShare(itemId, groupId);
        }
      }
      onSave?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to update sharing.');
    } finally {
      setSaving(false);
    }
  }

  const title = type === 'thing' ? 'Edit shared things' : 'Edit shared requests';
  const emptyMessage = type === 'thing'
    ? "You don't have any things yet."
    : "You don't have any requests yet.";

  return (
    <div
      className="edit-group-sharing-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-group-sharing-modal-title"
    >
      <div className="edit-group-sharing-modal-card">
        <h2 id="edit-group-sharing-modal-title" className="edit-group-sharing-modal-title">
          {title}
        </h2>
        <p className="edit-group-sharing-modal-hint">
          Check the items you want to share with this group.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {items.length === 0 ? (
          <p className="status">{emptyMessage}</p>
        ) : (
          <ul className="edit-group-sharing-list" aria-label={`List of ${type}s`}>
            {items.map((item) => (
              <li key={item.id} className="edit-group-sharing-row">
                <input
                  type="checkbox"
                  id={`edit-sharing-${item.id}`}
                  className="edit-group-sharing-checkbox"
                  checked={checkedIds.includes(item.id)}
                  onChange={() => toggle(item.id)}
                  disabled={saving}
                  aria-label={`Share "${item.name || 'Untitled'}" with group`}
                />
                <label htmlFor={`edit-sharing-${item.id}`} className="edit-group-sharing-label">
                  <span className="edit-group-sharing-name">{item.name || 'Untitled'}</span>
                  {item.description && (
                    <span className="edit-group-sharing-description">{item.description}</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="edit-group-sharing-modal-actions">
          <button
            type="button"
            className="submit-button"
            onClick={handleSave}
            disabled={saving || items.length === 0}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="header-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditGroupSharingModal;
