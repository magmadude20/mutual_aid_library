import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMyRequests(userId) {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchMyRequests() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, user_id, type')
          .eq('user_id', userId)
          .eq('type', 'request');

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setMyRequests(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load your requests.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetchMyRequests();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { myRequests, setMyRequests, loading, error };
}
