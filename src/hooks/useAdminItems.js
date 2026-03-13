import { useEffect, useState } from 'react';
import { getItems } from '../services/itemsService';
import { getSharesForThings } from '../services/thingsToGroupsService';

export function useAdminItems() {
  const [items, setItems] = useState([]);
  const [groupCountByItemId, setGroupCountByItemId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getItems({ type: 'thing' });
        if (!isMounted) return;
        setItems(data ?? []);

        const itemIds = (data ?? []).map((i) => i.id);
        if (!itemIds.length) {
          setGroupCountByItemId({});
          return;
        }
        const shares = await getSharesForThings(itemIds);
        if (!isMounted) return;
        const counts = (shares ?? []).reduce((acc, row) => {
          acc[row.thing_id] = (acc[row.thing_id] ?? 0) + 1;
          return acc;
        }, {});
        setGroupCountByItemId(counts);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load items.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { items, groupCountByItemId, loading, error };
}

