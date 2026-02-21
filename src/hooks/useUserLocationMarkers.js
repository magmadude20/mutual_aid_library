import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Given a list of things (with user_id), fetches profile locations for those owners
 * and returns one marker per user who has a location set.
 */
export function useUserLocationMarkers(things) {
  const userIdsKey = useMemo(
    () =>
      (things ?? [])
        .map((t) => t.user_id)
        .filter(Boolean)
        .filter((id, i, a) => a.indexOf(id) === i)
        .sort()
        .join(','),
    [things]
  );
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userIdsKey) {
      setProfiles([]);
      setLoading(false);
      return;
    }
    const userIds = userIdsKey.split(',');
    let isMounted = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, latitude, longitude')
          .in('id', userIds);
        if (error) throw error;
        if (!isMounted) return;
        setProfiles(
          (data ?? []).filter(
            (p) =>
              p.latitude != null &&
              p.longitude != null &&
              Number.isFinite(p.latitude) &&
              Number.isFinite(p.longitude)
          )
        );
      } catch {
        if (isMounted) setProfiles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userIdsKey]);

  return useMemo(() => {
    const markers = profiles.map((p) => ({
      userId: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      fullName: p.full_name?.trim() || null,
      things: things.filter((t) => t.user_id === p.id),
    }));
    return { markers, loading };
  }, [profiles, things, loading]);
}
