import { useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';

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
        const data = await getItems({ type: 'request' });
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
