import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useThings(session) {
  const [things, setThings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    let isMounted = true;
    async function fetchThings() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('items')
          .select('id, name, description, user_id, type')
          .eq('type', 'thing');

        if (fetchError) throw fetchError;
        if (!isMounted) return;
        setThings(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load things.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetchThings();
    return () => {
      isMounted = false;
    };
  }, [session]);

  return { things, setThings, loading, error };
}
