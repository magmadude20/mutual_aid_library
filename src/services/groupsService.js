import { supabase } from '../lib/supabaseClient';

export async function getAdminGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, is_public')
    .order('name');
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getGroupMembershipsForUser(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role')
    .eq('user_id', userId);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getGroupsByIds(ids, { withInvite = false } = {}) {
  if (!ids?.length) return [];
  let query = supabase
    .from('groups')
    .select(
      withInvite
        ? 'id, name, description, is_public, invite_token, created_at'
        : 'id, name, description, is_public, invite_token, latitude, longitude'
    )
    .in('id', ids)
    .order('name');
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getPublicGroupsExcludingUser(userId) {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, description, invite_token, latitude, longitude')
    .eq('is_public', true)
    .order('name');
  if (error) {
    throw error;
  }
  let list = data ?? [];
  if (userId) {
    const { data: myMemberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);
    const myIds = new Set((myMemberships ?? []).map((r) => r.group_id));
    list = list.filter((g) => !myIds.has(g.id));
  }
  return list;
}

