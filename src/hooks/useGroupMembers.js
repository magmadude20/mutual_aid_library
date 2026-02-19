import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useGroupMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', m.user_id)
              .maybeSingle();
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

  return { members, setMembers, loading, error };
}
