-- Extend get_group_by_invite_token to return description and location for join page.
create or replace function get_group_by_invite_token(invite_token_param text)
returns table (id uuid, name text, description text, latitude double precision, longitude double precision, already_member boolean)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name, g.description, g.latitude, g.longitude,
    exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = auth.uid())
  from groups g where g.invite_token = invite_token_param;
$$;
