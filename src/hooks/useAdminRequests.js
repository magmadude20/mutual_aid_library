import { useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';
import { getSharesForThings } from '../services/thingsToGroupsService';

export function useAdminRequests() {
  const [requests, setRequests] = useState([]);
  const [groupCountByRequestId, setGroupCountByRequestId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getItems({ type: 'request' });
        if (!isMounted) return;
        setRequests(data ?? []);

        const requestIds = (data ?? []).map((i) => i.id);
        if (!requestIds.length) {
          setGroupCountByRequestId({});
          return;
        }
        const shares = await getSharesForThings(requestIds);
        if (!isMounted) return;
        const counts = (shares ?? []).reduce((acc, row) => {
          acc[row.thing_id] = (acc[row.thing_id] ?? 0) + 1;
          return acc;
        }, {});
        setGroupCountByRequestId(counts);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load requests.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { requests, groupCountByRequestId, loading, error };
}

