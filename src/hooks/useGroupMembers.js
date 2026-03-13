import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getProfileById } from '../services/profilesService';

export function useGroupMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!groupId) return;
    let isMounted = true;
    async function fetch() {
      try {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('group_members')
          .select('user_id, role, joined_at')
          .eq('group_id', groupId)
          .order('joined_at');
        if (fetchError) throw fetchError;
        if (!isMounted) return;
        const withProfiles = await Promise.all(
          (data ?? []).map(async (m) => {
            const profile = await getProfileById(m.user_id);
            return { ...m, full_name: profile?.full_name?.trim() || null };
          })
        );
        if (!isMounted) return;
        setMembers(withProfiles);
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load members.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    }
    fetch();
    return () => { isMounted = false; };
  }, [groupId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { members, setMembers, loading, error, refetch };
}
