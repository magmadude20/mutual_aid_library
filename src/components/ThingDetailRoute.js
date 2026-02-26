import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ThingDetailPage from './ThingDetailPage';

function ThingDetailRoute({ user, setThings, setMyThings, setRequests, setMyRequests }) {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [thing, setThing] = useState(state?.thing ?? null);
  const [loading, setLoading] = useState(!state?.thing);

  useEffect(() => {
    if (state?.thing) return;
    if (!id) return;
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('id, name, description, user_id, type')
          .eq('id', id)
          .maybeSingle();
        if (!isMounted) return;
        if (error) throw error;
        setThing(data);
      } catch {
        if (isMounted) setThing(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [id, state?.thing]);

  if (loading) {
    return (
      <div className="App-main">
        <p className="status">Loading thing…</p>
      </div>
    );
  }

  if (!thing) {
    return (
      <div className="App-main">
        <p className="status error">Thing not found.</p>
      </div>
    );
  }

  function handleThingUpdated(updated) {
    if (thing?.type === 'request') {
      setRequests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMyRequests((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      setThings((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setMyThings((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
    setThing(updated);
    navigate(`/thing/${updated.id}`, { replace: true, state: { thing: updated } });
  }

  function handleThingDeleted() {
    if (thing?.type === 'request') {
      setRequests((prev) => prev.filter((t) => t.id !== thing.id));
      setMyRequests((prev) => prev.filter((t) => t.id !== thing.id));
    } else {
      setThings((prev) => prev.filter((t) => t.id !== thing.id));
      setMyThings((prev) => prev.filter((t) => t.id !== thing.id));
    }
    navigate('/');
  }

  return (
    <ThingDetailPage
      thing={thing}
      user={user}
      onBack={() => navigate(-1)}
      onThingUpdated={handleThingUpdated}
      onThingDeleted={handleThingDeleted}
    />
  );
}

export default ThingDetailRoute;
