import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useMyThings(userId) {
  const [myThings, setMyThings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchMyThings() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, user_id, is_public')
          .eq('user_id', userId);

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
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { myThings, setMyThings, loading, error };
}
