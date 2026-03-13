import { useEffect, useState } from 'react';
import { getGroupMembershipsForUser, getGroupsByIds } from '../services/groupsService';

/** Groups the given user (e.g. thing owner) is a member of. Used for thing sharing checkboxes. */
export function useOwnerGroups(ownerId) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ownerId) return;
    let isMounted = true;
    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const memberRows = await getGroupMembershipsForUser(ownerId);
        if (!isMounted) return;
        const groupIds = (memberRows ?? []).map((r) => r.group_id);
        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }
        const groupData = await getGroupsByIds(groupIds, { withInvite: false });
        if (!isMounted) return;
        setGroups(groupData ?? []);
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
  }, [ownerId]);

  return { groups, loading, error };
}
