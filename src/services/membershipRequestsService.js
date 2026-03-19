import { supabase } from '../lib/supabaseClient';

/**
 * Count membership requests with status=PENDING for any groups where the given user is an ADMIN.
 * Used for admin UI badges.
 */
export async function getAdminPendingMembershipRequestsCount(adminUserId) {
  if (!adminUserId) return 0;

  const { data: adminMembershipRows, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', adminUserId)
    .eq('role', 'ADMIN');

  if (membershipError) throw membershipError;

  const adminGroupIds = Array.from(
    new Set((adminMembershipRows ?? []).map((r) => r.group_id).filter(Boolean))
  );
  if (adminGroupIds.length === 0) return 0;

  const { data: pendingRows, error: pendingError } = await supabase
    .from('membership_requests')
    .select('id')
    .eq('status', 'PENDING')
    .in('group_id', adminGroupIds);

  if (pendingError) throw pendingError;

  return (pendingRows ?? []).length;
}

/**
 * For groups where `adminUserId` is an ADMIN member, return:
 *   { [groupId]: pendingCount }
 */
export async function getAdminPendingMembershipRequestsCountByGroup(adminUserId) {
  if (!adminUserId) return {};

  const { data: adminMembershipRows, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', adminUserId)
    .eq('role', 'ADMIN');

  if (membershipError) throw membershipError;

  const adminGroupIds = Array.from(
    new Set((adminMembershipRows ?? []).map((r) => r.group_id).filter(Boolean))
  );
  if (adminGroupIds.length === 0) return {};

  const { data: pendingRows, error: pendingError } = await supabase
    .from('membership_requests')
    .select('group_id')
    .eq('status', 'PENDING')
    .in('group_id', adminGroupIds);

  if (pendingError) throw pendingError;

  return (pendingRows ?? []).reduce((acc, row) => {
    const groupId = row.group_id;
    acc[groupId] = (acc[groupId] ?? 0) + 1;
    return acc;
  }, {});
}

