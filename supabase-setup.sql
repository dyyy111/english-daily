-- Run this in your own Supabase project: SQL Editor > New query > Run.
-- Stores one full learning snapshot per signed-in user.
create table if not exists public.learning_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.learning_state enable row level security;
revoke all on public.learning_state from anon;
grant select, insert, update on public.learning_state to authenticated;

drop policy if exists "Users select own learning" on public.learning_state;
create policy "Users select own learning" on public.learning_state
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own learning" on public.learning_state;
create policy "Users insert own learning" on public.learning_state
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own learning" on public.learning_state;
create policy "Users update own learning" on public.learning_state
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Optimistic concurrency: if a different device changed the server version,
-- return conflict instead of overwriting those updates.
create or replace function public.save_learning_state(p_state jsonb, p_expected_version bigint)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  next_version bigint;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object'
     or not (p_state ? 'units' and p_state ? 'records' and p_state ? 'history') then
    raise exception 'Invalid learning state';
  end if;
  if p_expected_version = 0 then
    insert into public.learning_state (user_id, state, version)
    values (uid, p_state, 1) on conflict (user_id) do nothing
    returning version into next_version;
  else
    update public.learning_state
       set state=p_state, version=version+1, updated_at=now()
     where user_id=uid and version=p_expected_version
     returning version into next_version;
  end if;
  if next_version is null then
    return jsonb_build_object('ok', false, 'conflict', true);
  end if;
  return jsonb_build_object('ok', true, 'version', next_version);
end;
$$;
revoke all on function public.save_learning_state(jsonb,bigint) from public;
grant execute on function public.save_learning_state(jsonb,bigint) to authenticated;
