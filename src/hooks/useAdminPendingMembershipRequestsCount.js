import { useEffect, useState } from 'react';
import { getAdminPendingMembershipRequestsCount } from '../services/membershipRequestsService';

export function useAdminPendingMembershipRequestsCount(adminUserId) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!adminUserId) {
      setCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const next = await getAdminPendingMembershipRequestsCount(adminUserId);
        if (!isMounted) return;
        setCount(next);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load pending requests.');
        setCount(0);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [adminUserId]);

  return { count, loading, error };
}

