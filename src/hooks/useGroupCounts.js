import { useEffect, useMemo, useState } from 'react';
import { getGroupIdsForGroups } from '../services/thingsToGroupsService';

/** Member count and thing count per group id. */
export function useGroupCounts(groupIds) {
  const [memberCountByGroupId, setMemberCountByGroupId] = useState({});
  const [thingCountByGroupId, setThingCountByGroupId] = useState({});
  const [loading, setLoading] = useState(false);

  const idsKey = useMemo(
    () => (groupIds?.length > 0 ? [...new Set(groupIds)].sort().join(',') : ''),
    [groupIds]
  );

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) {
      setMemberCountByGroupId({});
      setThingCountByGroupId({});
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const [membersRes, thingsRows] = await Promise.all([
          // keep direct query for memberships
          import('../lib/supabaseClient').then(({ supabase }) =>
            supabase.from('group_members').select('group_id').in('group_id', ids)
          ),
          getGroupIdsForGroups(ids),
        ]);
        if (!isMounted) return;
        const memberCount = (membersRes.data ?? []).reduce((acc, r) => {
          acc[r.group_id] = (acc[r.group_id] ?? 0) + 1;
          return acc;
        }, {});
        const thingCount = (thingsRows ?? []).reduce((acc, r) => {
          acc[r.group_id] = (acc[r.group_id] ?? 0) + 1;
          return acc;
        }, {});
        setMemberCountByGroupId(memberCount);
        setThingCountByGroupId(thingCount);
      } catch {
        if (isMounted) {
          setMemberCountByGroupId({});
          setThingCountByGroupId({});
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [idsKey]);

  return { memberCountByGroupId, thingCountByGroupId, loading };
}
