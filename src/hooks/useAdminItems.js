import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
        const { data, error: itemsError } = await supabase
          .from('items')
          .select('id, name, description, user_id, type')
          .eq('type', 'thing')
          .order('name');
        if (!isMounted) return;
        if (itemsError) throw itemsError;
        setItems(data ?? []);

        const itemIds = (data ?? []).map((i) => i.id);
        if (!itemIds.length) {
          setGroupCountByItemId({});
          return;
        }
        const { data: shares, error: sharesError } = await supabase
          .from('things_to_groups')
          .select('thing_id')
          .in('thing_id', itemIds);
        if (!isMounted) return;
        if (sharesError) throw sharesError;
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

