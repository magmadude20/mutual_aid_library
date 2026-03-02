import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMyThings(userId) {
  const [myThings, setMyThings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchMyThings() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, user_id, type, created_at')
          .eq('user_id', userId)
          .eq('type', 'thing');

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setMyThings(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load your things.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetchMyThings();
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { myThings, setMyThings, loading, error, refetch };
}
