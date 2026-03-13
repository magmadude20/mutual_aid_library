import { useCallback, useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';

export function useMyRequests(userId) {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchMyRequests() {
      try {
        setLoading(true);
        setError(null);
        const data = await getItems({ type: 'request', userId });
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
    return () => { isMounted = false; };
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { myRequests, setMyRequests, loading, error, refetch };
}
