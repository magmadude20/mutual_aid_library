import { supabase } from '../lib/supabaseClient';

const BASE_ITEM_SELECT =
  'id, name, description, additional_notes, user_id, type, created_at';

/**
 * Fetch items with optional filters.
 * Supported filters: type, userId, ids (array of ids).
 */
export async function getItems({ type, userId, ids } = {}) {
  let query = supabase.from('items').select(BASE_ITEM_SELECT);

  if (type) {
    query = query.eq('type', type);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (ids && ids.length) {
    query = query.in('id', ids);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data ?? [];
}

export async function getItemById(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('items')
    .select(BASE_ITEM_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ?? null;
}

export async function createItem({
  userId,
  name,
  description,
  additionalNotes,
  type,
}) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      additional_notes: additionalNotes || null,
      type,
    })
    .select(BASE_ITEM_SELECT)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function updateItem(id, { name, description, additionalNotes }) {
  const { data, error } = await supabase
    .from('items')
    .update({
      name,
      description: description || null,
      additional_notes: additionalNotes || null,
    })
    .eq('id', id)
    .select(BASE_ITEM_SELECT)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

