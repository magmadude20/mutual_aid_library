import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOwnerGroups } from '../hooks/useOwnerGroups';
import './AddItemModal.css';

/**
 * Modal with form to add a thing or request. Reusable from profile (My things/requests) and group detail page.
 * All groups start selected for sharing.
 * @param {'thing' | 'request'} type
 * @param {string} userId - current user id
 * @param {(item: object) => void} onSuccess - called with the new item after insert
 * @param {() => void} onClose
 */
function AddItemModal({ type, userId, onSuccess, onClose }) {
  const isThing = type === 'thing';
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sharingGroupIds, setSharingGroupIds] = useState([]);
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { groups: ownerGroups, loading: ownerGroupsLoading } = useOwnerGroups(userId);

  useEffect(() => {
    if (!ownerGroupsLoading && ownerGroups?.length) {
      setSharingGroupIds(ownerGroups.map((g) => g.id));
    }
  }, [ownerGroupsLoading, ownerGroups]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }
    if (!userId) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const { data, error: insertError } = await supabase
        .from('items')
        .insert({
          user_id: userId,
          name: trimmedName,
          description: description.trim() || null,
          type: isThing ? 'thing' : 'request',
        })
        .select('id, name, description, user_id, type, created_at')
        .single();

      if (insertError) throw insertError;
      if (sharingGroupIds.length > 0) {
        const { error: shareError } = await supabase.from('things_to_groups').insert(
          sharingGroupIds.map((group_id) => ({ thing_id: data.id, group_id }))
        );
        if (shareError) throw shareError;
      }
      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      setFormError(err.message || (isThing ? 'Failed to add thing.' : 'Failed to add request.'));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleSharingGroup(groupId) {
    setSharingGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }

  const title = isThing ? 'Add thing' : 'Add request';
  const namePlaceholder = isThing ? 'Thing name' : 'What are you looking for?';
  const submitLabel = isThing ? 'Add thing' : 'Add request';

  return (
    <div
      className="add-item-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
    >
      <div className="add-item-modal-card">
        <h2 id="add-item-modal-title" className="add-item-modal-title">
          {title}
        </h2>
        <form className="add-thing-form add-item-modal-form" onSubmit={handleSubmit} aria-label={title}>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <label className="form-label" htmlFor="add-item-name">
            Name
          </label>
          <input
            id="add-item-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={namePlaceholder}
            required
            disabled={submitting}
            autoComplete="off"
          />
          <label className="form-label" htmlFor="add-item-description">
            Description (optional)
          </label>
          <textarea
            id="add-item-description"
            className="form-input form-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                      id={`add-item-modal-group-${g.id}`}
                      type="checkbox"
                      checked={sharingGroupIds.includes(g.id)}
                      onChange={() => toggleSharingGroup(g.id)}
                      disabled={submitting}
                    />
                    <label className="form-label" htmlFor={`add-item-modal-group-${g.id}`}>
                      {g.name}
                    </label>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="add-thing-form-actions add-item-modal-actions">
            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting ? 'Adding…' : submitLabel}
            </button>
            <button type="button" className="header-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddItemModal;
