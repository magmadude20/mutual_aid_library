import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
        const { data, error: fetchError } = await supabase
          .from('group_members')
          .select('group_id, role')
          .eq('user_id', userId);
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const memberships = data ?? [];
        const groupIds = memberships.map((r) => r.group_id);
        const roleByGroupId = {};
        memberships.forEach((m) => {
          roleByGroupId[m.group_id] = m.role;
        });
        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name, description, is_public, invite_token, created_at')
          .in('id', groupIds)
          .order('name');
        if (groupError) throw groupError;
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
