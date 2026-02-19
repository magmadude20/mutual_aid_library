import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Which groups a thing is shared with (thing_groups for thingId). */
export function useThingGroups(thingId) {
  const [groupIds, setGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refetch = useCallback((silent = false) => {
    if (!thingId) return;
    (async () => {
      try {
        if (!silent) setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('things_to_groups')
          .select('group_id')
          .eq('thing_id', thingId);
        if (fetchError) throw fetchError;
        if (!mountedRef.current) return;
        setGroupIds((data ?? []).map((r) => r.group_id));
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err.message || 'Failed to load sharing.');
      } finally {
        if (mountedRef.current && !silent) setLoading(false);
      }
    })();
  }, [thingId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { groupIds, setGroupIds, loading, error, refetch };
}
