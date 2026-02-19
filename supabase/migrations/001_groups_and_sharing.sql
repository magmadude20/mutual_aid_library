-- Groups and sharing: groups, group_members, things_to_groups, items.is_public, RLS, RPC
-- Run this in the Supabase SQL Editor.

-- 1. Enum for group member role
create type group_member_role as enum ('ADMIN', 'MEMBER');

-- 2. groups table
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_public boolean not null default true,
  invite_token text unique not null,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- 3. group_members (users to groups)
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role group_member_role not null,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- 4. things_to_groups
create table things_to_groups (
  thing_id uuid not null references items(id) on delete cascade,
  group_id uuid not null references groups(id) on delete cascade,
  primary key (thing_id, group_id)
);

-- 5. Add is_public to items (thing visible to all logged-in users when true)
alter table items add column if not exists is_public boolean not null default true;

-- 6. RLS groups
alter table groups enable row level security;

create policy "groups_select_member_or_public"
  on groups for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid()
    )
    or groups.is_public = true
  );

create policy "groups_insert_authenticated"
  on groups for insert
  to authenticated
  with check (true);

create policy "groups_update_admin"
  on groups for update
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'ADMIN'
    )
  );

create policy "groups_delete_admin"
  on groups for delete
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = groups.id and gm.user_id = auth.uid() and gm.role = 'ADMIN'
    )
  );

-- 7. RLS group_members (use SECURITY DEFINER helpers to avoid self-recursion in policies)
create or replace function is_member_of_group(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function is_admin_of_group(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'ADMIN'
  );
$$;

-- Creator of a group can add themselves (for create-group flow); no RLS recursion (reads groups only).
create or replace function is_creator_of_group(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from groups
    where id = p_group_id and created_by = auth.uid()
  );
$$;

alter table group_members enable row level security;

create policy "group_members_select_in_group"
  on group_members for select
  using (is_member_of_group(group_id));

-- Insert: creator can add themselves when creating a group; existing members can add others; RPC does join-by-token.
create policy "group_members_insert_member"
  on group_members for insert
  to authenticated
  with check (is_member_of_group(group_id) or is_creator_of_group(group_id));

create policy "group_members_delete_self_or_admin"
  on group_members for delete
  using (user_id = auth.uid() or is_admin_of_group(group_id));

create policy "group_members_update_admin"
  on group_members for update
  using (is_admin_of_group(group_id));

-- 8. RLS things_to_groups
alter table things_to_groups enable row level security;

create policy "things_to_groups_select_visible"
  on things_to_groups for select
  using (
    exists (select 1 from items i where i.id = things_to_groups.thing_id and (i.user_id = auth.uid() or i.is_public = true))
    or exists (
      select 1 from group_members gm
      where gm.group_id = things_to_groups.group_id and gm.user_id = auth.uid()
    )
  );

create policy "things_to_groups_all_owner"
  on things_to_groups for all
  using (
    exists (select 1 from items i where i.id = things_to_groups.thing_id and i.user_id = auth.uid())
  )
  with check (
    exists (select 1 from items i where i.id = things_to_groups.thing_id and i.user_id = auth.uid())
  );

-- 9. Items: replace select policy so visibility = is_public OR owner OR in a group that has the thing
-- Use a SECURITY DEFINER function to avoid recursion: items policy -> things_to_groups -> items.
create or replace function item_visible_to_user(item_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from items i
    where i.id = item_id
    and (
      i.is_public = true
      or i.user_id = auth.uid()
      or exists (
        select 1 from things_to_groups tg
        join group_members gm on gm.group_id = tg.group_id and gm.user_id = auth.uid()
        where tg.thing_id = i.id
      )
    )
  );
$$;

drop policy if exists "Allow public read" on items;

create policy "items_select_visible"
  on items for select
  using (item_visible_to_user(id));

-- Ensure items has policies for insert/update/delete for owners if not already present
-- (many setups have "authenticated can insert own", "owner can update/delete")
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'items' and policyname = 'items_insert_own') then
    create policy "items_insert_own" on items for insert to authenticated with check (user_id = auth.uid());
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'items' and policyname = 'items_update_own') then
    create policy "items_update_own" on items for update using (user_id = auth.uid());
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'items' and policyname = 'items_delete_own') then
    create policy "items_delete_own" on items for delete using (user_id = auth.uid());
  end if;
end $$;

-- 10. RPC: join group by invite token (SECURITY DEFINER so it can insert into group_members)
create or replace function join_group_by_token(invite_token_param text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  group_id_found uuid;
  already_member boolean;
begin
  select id into group_id_found from groups where invite_token = invite_token_param;
  if group_id_found is null then
    raise exception 'Group not found';
  end if;

  select exists (
    select 1 from group_members
    where group_id = group_id_found and user_id = auth.uid()
  ) into already_member;
  if already_member then
    return group_id_found;
  end if;

  insert into group_members (group_id, user_id, role)
  values (group_id_found, auth.uid(), 'MEMBER');
  return group_id_found;
end;
$$;

-- Optional: get group by invite token for join page (id, name, already_member)
create or replace function get_group_by_invite_token(invite_token_param text)
returns table (id uuid, name text, already_member boolean)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name,
    exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = auth.uid())
  from groups g where g.invite_token = invite_token_param;
$$;
