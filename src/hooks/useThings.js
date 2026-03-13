import { useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';

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
        const data = await getItems({ type: 'thing' });
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
