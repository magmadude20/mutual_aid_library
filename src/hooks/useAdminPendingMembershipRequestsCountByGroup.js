import { useEffect, useState } from 'react';
import { getAdminPendingMembershipRequestsCountByGroup } from '../services/membershipRequestsService';

export function useAdminPendingMembershipRequestsCountByGroup(adminUserId) {
  const [countByGroupId, setCountByGroupId] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!adminUserId) {
      setCountByGroupId({});
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const next = await getAdminPendingMembershipRequestsCountByGroup(adminUserId);
        if (!isMounted) return;
        setCountByGroupId(next ?? {});
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load pending requests.');
        setCountByGroupId({});
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [adminUserId]);

  return { countByGroupId, loading, error };
}

