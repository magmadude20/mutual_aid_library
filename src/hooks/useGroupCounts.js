import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Member count and thing count per group id. */
export function useGroupCounts(groupIds) {
  const [memberCountByGroupId, setMemberCountByGroupId] = useState({});
  const [thingCountByGroupId, setThingCountByGroupId] = useState({});
  const [loading, setLoading] = useState(false);

  const ids = groupIds?.length > 0 ? [...new Set(groupIds)] : [];

  useEffect(() => {
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
        const [membersRes, thingsRes] = await Promise.all([
          supabase.from('group_members').select('group_id').in('group_id', ids),
          supabase.from('things_to_groups').select('group_id').in('group_id', ids),
        ]);
        if (!isMounted) return;
        const memberCount = (membersRes.data ?? []).reduce((acc, r) => {
          acc[r.group_id] = (acc[r.group_id] ?? 0) + 1;
          return acc;
        }, {});
        const thingCount = (thingsRes.data ?? []).reduce((acc, r) => {
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
  }, [ids.join(',')]);

  return { memberCountByGroupId, thingCountByGroupId, loading };
}
