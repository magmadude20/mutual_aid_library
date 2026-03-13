import { useCallback, useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';

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
        const data = await getItems({ type: 'thing', userId });
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
