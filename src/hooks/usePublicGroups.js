import { useEffect, useState } from 'react';
import { getPublicGroupsExcludingUser } from '../services/groupsService';

export function usePublicGroups(userId) {
  const [publicGroups, setPublicGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const list = await getPublicGroupsExcludingUser(userId);
        if (!isMounted) return;
        setPublicGroups(list);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load public groups.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetch();
    return () => { isMounted = false; };
  }, [userId]);

  return { publicGroups, setPublicGroups, loading, error };
}
