-- Admin RLS overrides: allow admins (profiles.role = 'admin') to access everything.

-- Ensure RLS is enabled on profiles and items (safe if already enabled).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Admin policies for profiles
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles
  FOR DELETE
  USING (public.is_admin());

-- Admin policies for items
CREATE POLICY "items_select_admin"
  ON public.items
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "items_update_admin"
  ON public.items
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "items_delete_admin"
  ON public.items
  FOR DELETE
  USING (public.is_admin());

-- Admin policies for groups
CREATE POLICY "groups_select_admin_global"
  ON public.groups
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "groups_update_admin_global"
  ON public.groups
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "groups_delete_admin_global"
  ON public.groups
  FOR DELETE
  USING (public.is_admin());

-- Admin policies for group_members
CREATE POLICY "group_members_select_admin_global"
  ON public.group_members
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "group_members_insert_admin_global"
  ON public.group_members
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "group_members_update_admin_global"
  ON public.group_members
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "group_members_delete_admin_global"
  ON public.group_members
  FOR DELETE
  USING (public.is_admin());

-- Admin policies for things_to_groups
CREATE POLICY "things_to_groups_select_admin_global"
  ON public.things_to_groups
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "things_to_groups_insert_admin_global"
  ON public.things_to_groups
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "things_to_groups_update_admin_global"
  ON public.things_to_groups
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "things_to_groups_delete_admin_global"
  ON public.things_to_groups
  FOR DELETE
  USING (public.is_admin());
