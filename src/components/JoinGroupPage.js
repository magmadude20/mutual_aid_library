import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './JoinGroupPage.css';

function JoinGroupPage({ user }) {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <div className="join-group-page">
      <h2 className="join-group-title">Join group</h2>
      <p className="join-group-name">{group.name}</p>
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
