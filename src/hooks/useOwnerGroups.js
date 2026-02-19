import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
        const { data: memberRows, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', ownerId);
        if (memberError) throw memberError;
        if (!isMounted) return;
        const groupIds = (memberRows ?? []).map((r) => r.group_id);
        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds)
          .order('name');
        if (groupError) throw groupError;
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
