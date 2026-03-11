import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Map from './Map';
import './JoinGroupPage.css';

function JoinGroupPage({ user }) {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_group_by_invite_token', {
          invite_token_param: inviteToken,
        });
        if (!isMounted) return;
        if (rpcError) throw rpcError;
        const row = Array.isArray(data) ? data[0] : data;
        setGroup(row ?? null);
        if (row?.pending_request_message) {
          setMessage(row.pending_request_message);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load group.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [inviteToken]);

  async function handleJoin() {
    if (!inviteToken || !user) return;
    setJoining(true);
    setError(null);
    try {
      const { data: groupId, error: rpcError } = await supabase.rpc('join_group_by_token', {
        invite_token_param: inviteToken,
      });
      if (rpcError) throw rpcError;
      // If this group requires approval and we're creating a new pending request,
      // persist the message on the newly created membership_request row.
      const trimmed = message.trim();
      if (group?.requires_approval && !group?.pending_request_id && trimmed) {
        await supabase
          .from('membership_requests')
          .update({ message: trimmed })
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .eq('status', 'PENDING');
      }
      setJoining(false);
      navigate(`/groups/${groupId}`, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to join group.');
      setJoining(false);
    }
  }

  if (!user) {
    return (
      <div className="App-main">
        <p className="status">Sign in to join a group.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="App-main">
        <p className="status">Loading…</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="App-main">
        <p className="status error">{error}</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="App-main">
        <p className="status error">Invalid or expired invite link.</p>
      </div>
    );
  }

  const alreadyMember = group.already_member === true;
  const requiresApproval = group.requires_approval === true;
  const hasPendingRequest = !!group.pending_request_id;
  const hasLocation =
    group.latitude != null &&
    group.longitude != null &&
    Number.isFinite(group.latitude) &&
    Number.isFinite(group.longitude);

  return (
    <div className="join-group-page">
      <h2 className="join-group-title">Join group</h2>
      <div className="join-group-info">
        <h3 className="join-group-name">{group.name}</h3>
        {group.description && (
          <p className="join-group-description">{group.description}</p>
        )}
        {hasLocation && (
          <div className="join-group-location">
            <h4 className="join-group-location-title">Location</h4>
            <div className="join-group-map-wrapper">
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
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {alreadyMember ? (
        <>
          <p className="join-group-hint">You're already in this group.</p>
          <button
            type="button"
            className="submit-button"
            onClick={() => navigate(`/groups/${group.id}`)}
          >
            Go to group
          </button>
        </>
      ) : requiresApproval ? (
        <>
          {hasPendingRequest ? (
            <>
              <p className="join-group-hint">Your application to join this group is pending.</p>
              <label className="form-label" htmlFor="join-message">Message to admins (optional)</label>
              <textarea
                id="join-message"
                className="form-input form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={savingMessage}
              />
              <button
                type="button"
                className="submit-button"
                onClick={async () => {
                  if (!group.pending_request_id) return;
                  setSavingMessage(true);
                  setError(null);
                  try {
                    const { error: updateError } = await supabase
                      .from('membership_requests')
                      .update({ message: message.trim() || null })
                      .eq('id', group.pending_request_id);
                    if (updateError) throw updateError;
                  } catch (err) {
                    setError(err.message || 'Failed to update message.');
                  } finally {
                    setSavingMessage(false);
                  }
                }}
              >
                {savingMessage ? 'Saving…' : 'Update message'}
              </button>
            </>
          ) : (
            <>
              <p className="join-group-hint">
                This group requires admin approval to join. Submit a request below.
              </p>
              <label className="form-label" htmlFor="join-message">Message to admins (optional)</label>
              <textarea
                id="join-message"
                className="form-input form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={joining}
              />
              <button
                type="button"
                className="submit-button"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? 'Submitting…' : 'Request to join'}
              </button>
            </>
          )}
        </>
      ) : (
        <button
          type="button"
          className="submit-button"
          onClick={handleJoin}
          disabled={joining}
        >
          {joining ? 'Joining…' : 'Join group'}
        </button>
      )}
      <button
        type="button"
        className="header-button"
        onClick={() => navigate('/groups')}
      >
        Back to My groups
      </button>
    </div>
  );
}

export default JoinGroupPage;
