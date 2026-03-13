import { supabase } from '../lib/supabaseClient';

export async function getProfileById(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, contact_info')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ?? null;
}

