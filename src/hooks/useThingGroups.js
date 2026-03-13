import { useCallback, useEffect, useRef, useState } from 'react';
import { getGroupIdsForThing } from '../services/thingsToGroupsService';

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
        const groupIds = await getGroupIdsForThing(thingId);
        if (!mountedRef.current) return;
        setGroupIds(groupIds);
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
