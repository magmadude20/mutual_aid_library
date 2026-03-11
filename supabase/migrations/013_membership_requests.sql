-- Membership requests: require_approval flag on groups, membership_requests table, RLS, and helper functions/RPCs

-- 1) requires_approval flag on groups
alter table groups
  add column if not exists requires_approval boolean not null default false;

-- 2) Enum for membership request status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_request_status') then
    create type membership_request_status as enum ('PENDING', 'APPROVED', 'DENIED');
  end if;
end $$;

-- 3) membership_requests table
create table if not exists membership_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status membership_request_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

-- Ensure updated_at stays in sync
create or replace function set_membership_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists membership_requests_set_updated_at on membership_requests;
create trigger membership_requests_set_updated_at
before update on membership_requests
for each row
execute function set_membership_requests_updated_at();

-- Unique pending request per user per group
create unique index if not exists membership_requests_unique_pending_per_user_group
on membership_requests (group_id, user_id)
where status = 'PENDING';

-- Basic indexes for admin/retrieval
create index if not exists membership_requests_group_status_idx
  on membership_requests (group_id, status);

create index if not exists membership_requests_user_group_created_idx
  on membership_requests (user_id, group_id, created_at desc);

-- 4) RLS for membership_requests
alter table membership_requests enable row level security;

-- Helper: is_admin_of_group already exists from 001_groups_and_sharing.sql

-- Requester can see their own requests
drop policy if exists membership_requests_select_self on membership_requests;
create policy membership_requests_select_self
  on membership_requests
  for select
  using (user_id = auth.uid());

-- Admins can see requests for their groups
drop policy if exists membership_requests_select_admin on membership_requests;
create policy membership_requests_select_admin
  on membership_requests
  for select
  using (is_admin_of_group(group_id));

-- Requester can insert a request for themselves
drop policy if exists membership_requests_insert_self on membership_requests;
create policy membership_requests_insert_self
  on membership_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Requester can update their own PENDING request (e.g. message)
drop policy if exists membership_requests_update_self_pending on membership_requests;
create policy membership_requests_update_self_pending
  on membership_requests
  for update
  to authenticated
  using (user_id = auth.uid() and status = 'PENDING')
  with check (user_id = auth.uid());

-- Admin can update requests for their groups (approve/deny, reviewed_* fields)
drop policy if exists membership_requests_update_admin on membership_requests;
create policy membership_requests_update_admin
  on membership_requests
  for update
  to authenticated
  using (is_admin_of_group(group_id));

-- 5) Extend get_group_by_invite_token to include requires_approval and current user's pending request
create or replace function get_group_by_invite_token(invite_token_param text)
returns table (
  id uuid,
  name text,
  description text,
  latitude double precision,
  longitude double precision,
  already_member boolean,
  requires_approval boolean,
  pending_request_id uuid,
  pending_request_message text
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.description,
    g.latitude,
    g.longitude,
    exists (
      select 1 from group_members gm
      where gm.group_id = g.id and gm.user_id = auth.uid()
    ) as already_member,
    g.requires_approval,
    mr.id as pending_request_id,
    mr.message as pending_request_message
  from groups g
  left join membership_requests mr
    on mr.group_id = g.id
   and mr.user_id = auth.uid()
   and mr.status = 'PENDING'
  where g.invite_token = invite_token_param;
$$;

-- 6) Update join_group_by_token to respect requires_approval and create membership_requests when needed
create or replace function join_group_by_token(invite_token_param text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  group_id_found uuid;
  requires_approval_flag boolean;
  already_member boolean;
  existing_pending_id uuid;
begin
  select id, requires_approval
  into group_id_found, requires_approval_flag
  from groups
  where invite_token = invite_token_param;

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

  if requires_approval_flag is false then
    insert into group_members (group_id, user_id, role)
    values (group_id_found, auth.uid(), 'MEMBER');
    return group_id_found;
  end if;

  -- requires_approval = true: ensure there is a PENDING membership_request
  select id
  into existing_pending_id
  from membership_requests
  where group_id = group_id_found
    and user_id = auth.uid()
    and status = 'PENDING'
  limit 1;

  if existing_pending_id is null then
    insert into membership_requests (group_id, user_id, status)
    values (group_id_found, auth.uid(), 'PENDING');
  end if;

  return group_id_found;
end;
$$;

-- 7) Admin helpers: approve/deny membership requests
create or replace function approve_membership_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_user_id uuid;
begin
  select group_id, user_id
  into v_group_id, v_user_id
  from membership_requests
  where id = p_request_id;

  if v_group_id is null then
    raise exception 'Request not found';
  end if;

  if not is_admin_of_group(v_group_id) then
    raise exception 'Not authorized';
  end if;

  update membership_requests
  set status = 'APPROVED',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request_id;

  insert into group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'MEMBER')
  on conflict (group_id, user_id) do nothing;
end;
$$;

create or replace function deny_membership_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select group_id
  into v_group_id
  from membership_requests
  where id = p_request_id;

  if v_group_id is null then
    raise exception 'Request not found';
  end if;

  if not is_admin_of_group(v_group_id) then
    raise exception 'Not authorized';
  end if;

  update membership_requests
  set status = 'DENIED',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request_id;
end;
$$;

