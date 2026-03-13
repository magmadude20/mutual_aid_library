import { supabase } from '../lib/supabaseClient';

export async function getGroupIdsForThing(thingId) {
  if (!thingId) return [];
  const { data, error } = await supabase
    .from('things_to_groups')
    .select('group_id')
    .eq('thing_id', thingId);
  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.group_id);
}

export async function getThingIdsForGroup(groupId) {
  if (!groupId) return [];
  const { data, error } = await supabase
    .from('things_to_groups')
    .select('thing_id')
    .eq('group_id', groupId);
  if (error) {
    throw error;
  }
  return (data ?? []).map((r) => r.thing_id);
}

export async function getSharesForThings(thingIds) {
  if (!thingIds?.length) return [];
  const { data, error } = await supabase
    .from('things_to_groups')
    .select('thing_id, group_id')
    .in('thing_id', thingIds);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getGroupIdsForGroups(groupIds) {
  if (!groupIds?.length) return [];
  const { data, error } = await supabase
    .from('things_to_groups')
    .select('group_id')
    .in('group_id', groupIds);
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function addShare(thingId, groupId) {
  const { error } = await supabase
    .from('things_to_groups')
    .insert({ thing_id: thingId, group_id: groupId });
  if (error) {
    throw error;
  }
}

export async function removeShare(thingId, groupId) {
  const { error } = await supabase
    .from('things_to_groups')
    .delete()
    .eq('thing_id', thingId)
    .eq('group_id', groupId);
  if (error) {
    throw error;
  }
}

export async function setThingGroups(thingId, groupIds) {
  const { error: delError } = await supabase
    .from('things_to_groups')
    .delete()
    .eq('thing_id', thingId);
  if (delError) {
    throw delError;
  }
  if (!groupIds?.length) return;
  const { error: insError } = await supabase
    .from('things_to_groups')
    .insert(groupIds.map((group_id) => ({ thing_id: thingId, group_id })));
  if (insError) {
    throw insError;
  }
}

