import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAdminGroups } from '../services/groupsService';
import { getGroupIdsForGroups } from '../services/thingsToGroupsService';

export function useAdminGroups() {
  const [groups, setGroups] = useState([]);
  const [memberCountByGroupId, setMemberCountByGroupId] = useState({});
  const [thingCountByGroupId, setThingCountByGroupId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const groupIds = useMemo(() => groups.map((g) => g.id), [groups]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminGroups();
        if (!isMounted) return;
        setGroups(data ?? []);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load groups.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (groupIds.length === 0) {
      setMemberCountByGroupId({});
      setThingCountByGroupId({});
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const [membersRes, thingsRows] = await Promise.all([
          supabase.from('group_members').select('group_id').in('group_id', groupIds),
          getGroupIdsForGroups(groupIds),
        ]);
        if (!isMounted) return;
        const memberCounts = (membersRes.data ?? []).reduce((acc, row) => {
          acc[row.group_id] = (acc[row.group_id] ?? 0) + 1;
          return acc;
        }, {});
        const thingCounts = (thingsRows ?? []).reduce((acc, row) => {
          acc[row.group_id] = (acc[row.group_id] ?? 0) + 1;
          return acc;
        }, {});
        setMemberCountByGroupId(memberCounts);
        setThingCountByGroupId(thingCounts);
      } catch {
        if (!isMounted) return;
        setMemberCountByGroupId({});
        setThingCountByGroupId({});
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [groupIds]);

  return { groups, memberCountByGroupId, thingCountByGroupId, loading, error };
}

