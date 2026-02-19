import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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
        const { data, error: fetchError } = await supabase
          .from('groups')
          .select('id, name, description, invite_token')
          .eq('is_public', true)
          .order('name');
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        let list = data ?? [];
        if (userId) {
          const { data: myMemberships } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId);
          const myIds = new Set((myMemberships ?? []).map((r) => r.group_id));
          list = list.filter((g) => !myIds.has(g.id));
        }
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
