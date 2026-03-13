import { useEffect, useState } from 'react';
import { getGroupMembershipsForUser, getGroupsByIds } from '../services/groupsService';

export function useMyGroups(userId) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const memberships = await getGroupMembershipsForUser(userId);
        if (!isMounted) return;
        const groupIds = memberships.map((r) => r.group_id);
        const roleByGroupId = {};
        memberships.forEach((m) => {
          roleByGroupId[m.group_id] = m.role;
        });
        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }
        const groupData = await getGroupsByIds(groupIds, { withInvite: true });
        if (!isMounted) return;
        const groupsWithRole = (groupData ?? []).map((g) => ({
          ...g,
          myRole: roleByGroupId[g.id] ?? null,
        }));
        setGroups(groupsWithRole);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load groups.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetch();
    return () => { isMounted = false; };
  }, [userId]);

  return { groups, setGroups, loading, error };
}
