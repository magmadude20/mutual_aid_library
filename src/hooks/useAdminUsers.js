import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [statsByUserId, setStatsByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .order('full_name');
        if (!isMounted) return;
        if (profilesError) throw profilesError;
        setUsers(profiles ?? []);

        const userIds = (profiles ?? []).map((p) => p.id);
        if (!userIds.length) {
          setStatsByUserId({});
          return;
        }

        const [membersRes, itemsRes] = await Promise.all([
          supabase.from('group_members').select('user_id, role').in('user_id', userIds),
          supabase.from('items').select('user_id').in('user_id', userIds),
        ]);
        if (!isMounted) return;
        const stats = {};
        (membersRes.data ?? []).forEach((row) => {
          if (!stats[row.user_id]) {
            stats[row.user_id] = { groups: 0, adminGroups: 0, items: 0 };
          }
          stats[row.user_id].groups += 1;
          if (row.role === 'ADMIN') {
            stats[row.user_id].adminGroups += 1;
          }
        });
        (itemsRes.data ?? []).forEach((row) => {
          if (!stats[row.user_id]) {
            stats[row.user_id] = { groups: 0, adminGroups: 0, items: 0 };
          }
          stats[row.user_id].items += 1;
        });
        setStatsByUserId(stats);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load users.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { users, statsByUserId, loading, error };
}

