import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useRequests(session) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    async function fetchRequests() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, user_id, type')
          .eq('type', 'request');

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setRequests(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load requests.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetchRequests();
    return () => {
      isMounted = false;
    };
  }, [session]);

  return { requests, setRequests, loading, error };
}
