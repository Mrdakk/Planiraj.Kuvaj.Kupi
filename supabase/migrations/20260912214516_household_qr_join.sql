-- Household identity: shared kitchen via QR + display name.
-- Anonymous users are authenticated; data is scoped by household_id.

create schema if not exists private;

grant usage on schema private to postgres, authenticated, service_role;

create table if not exists public.households (
  id uuid primary key default uuid_generate_v4(),
  join_token uuid not null unique default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  display_name text not null,
  auth_user_id uuid not null unique references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists household_members_name_unique
  on public.household_members (household_id, lower(trim(display_name)));

create index if not exists idx_household_members_household_id
  on public.household_members (household_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where auth_user_id = auth.uid()
  limit 1
$$;

revoke all on function private.current_household_id() from public;
grant execute on function private.current_household_id() to authenticated, service_role;

create or replace function private.set_household_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.household_id := private.current_household_id();
  if new.household_id is null then
    raise exception 'No household for current user';
  end if;
  return new;
end;
$$;

revoke all on function private.set_household_id() from public;
grant execute on function private.set_household_id() to authenticated, service_role;

create or replace function private.normalize_member_name(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '')
$$;

create or replace function private.create_household(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := private.normalize_member_name(p_name);
  v_household_id uuid;
  v_member_id uuid;
  v_token uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_name is null then
    raise exception 'Name required';
  end if;

  select hm.household_id, hm.id, h.join_token
    into v_household_id, v_member_id, v_token
  from public.household_members hm
  join public.households h on h.id = hm.household_id
  where hm.auth_user_id = v_uid
  limit 1;

  if v_household_id is not null then
    update public.household_members
    set display_name = v_name
    where id = v_member_id;
    return jsonb_build_object(
      'household_id', v_household_id,
      'member_id', v_member_id,
      'display_name', v_name,
      'join_token', v_token,
      'action', 'created'
    );
  end if;

  insert into public.households default values
  returning id, join_token into v_household_id, v_token;

  insert into public.household_members (household_id, display_name, auth_user_id)
  values (v_household_id, v_name, v_uid)
  returning id into v_member_id;

  return jsonb_build_object(
    'household_id', v_household_id,
    'member_id', v_member_id,
    'display_name', v_name,
    'join_token', v_token,
    'action', 'created'
  );
end;
$$;

create or replace function private.join_household(p_token uuid, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := private.normalize_member_name(p_name);
  v_household_id uuid;
  v_token uuid;
  v_member_id uuid;
  v_display_name text;
  v_action text := 'joined';
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if v_name is null then
    raise exception 'Name required';
  end if;

  select id, join_token
    into v_household_id, v_token
  from public.households
  where join_token = p_token;

  if v_household_id is null then
    raise exception 'Invalid token';
  end if;

  select id, display_name
    into v_member_id, v_display_name
  from public.household_members
  where household_id = v_household_id
    and lower(trim(display_name)) = lower(v_name)
  limit 1;

  delete from public.household_members
  where auth_user_id = v_uid
    and (v_member_id is null or id <> v_member_id);

  if v_member_id is not null then
    update public.household_members
    set auth_user_id = v_uid
    where id = v_member_id;
    v_action := 'rebind';
  else
    insert into public.household_members (household_id, display_name, auth_user_id)
    values (v_household_id, v_name, v_uid)
    returning id, display_name into v_member_id, v_display_name;
  end if;

  return jsonb_build_object(
    'household_id', v_household_id,
    'member_id', v_member_id,
    'display_name', coalesce(v_display_name, v_name),
    'join_token', v_token,
    'action', v_action
  );
end;
$$;

create or replace function public.create_household(p_name text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.create_household(p_name)
$$;

create or replace function public.join_household(p_token uuid, p_name text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.join_household(p_token, p_name)
$$;

revoke all on function private.create_household(text) from public;
revoke all on function private.join_household(uuid, text) from public;
revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(uuid, text) from public;
revoke all on function public.create_household(text) from anon;
revoke all on function public.join_household(uuid, text) from anon;

grant execute on function private.create_household(text) to authenticated, service_role;
grant execute on function private.join_household(uuid, text) to authenticated, service_role;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(uuid, text) to authenticated;

do $$
declare
  tbl text;
  tables text[] := array[
    'ingredients', 'ingredient_aliases', 'recipes', 'recipe_ingredients',
    'meal_plans', 'meals', 'pantry_items', 'shopping_lists', 'shopping_items',
    'consumption_logs', 'favorites'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'alter table public.%I add column if not exists household_id uuid references public.households(id) on delete cascade',
      tbl
    );
    execute format('alter table public.%I alter column user_id drop not null', tbl);
    execute format('alter table public.%I alter column household_id set not null', tbl);
  end loop;
end;
$$;

alter table public.recipes
  add column if not exists meal_types jsonb not null default '[]'::jsonb;

do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype in ('u', 'p')
      and c.conrelid::regclass::text in ('meal_plans', 'favorites', 'public.meal_plans', 'public.favorites')
      and a.attname = 'user_id'
      and c.contype = 'u'
  loop
    execute format('alter table %s drop constraint if exists %I', r.tbl, r.conname);
  end loop;
end;
$$;

drop index if exists public.idx_ingredients_user_name;
drop index if exists public.idx_recipes_user_id;
drop index if exists public.idx_pantry_items_user_ingredient;

create unique index if not exists idx_ingredients_household_name
  on public.ingredients (household_id, lower(name));
create index if not exists idx_recipes_household_id on public.recipes (household_id);
create unique index if not exists meal_plans_household_week_start_key
  on public.meal_plans (household_id, week_start);
create unique index if not exists favorites_household_recipe_key
  on public.favorites (household_id, recipe_id);
create index if not exists idx_pantry_items_household_ingredient
  on public.pantry_items (household_id, ingredient_id);

drop policy if exists "Users can manage own ingredients" on public.ingredients;
drop policy if exists "Users can manage own ingredient aliases" on public.ingredient_aliases;
drop policy if exists "Users can manage own recipes" on public.recipes;
drop policy if exists "Users can manage own recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Users can manage own meal plans" on public.meal_plans;
drop policy if exists "Users can manage own meals" on public.meals;
drop policy if exists "Users can manage own pantry items" on public.pantry_items;
drop policy if exists "Users can manage own shopping lists" on public.shopping_lists;
drop policy if exists "Users can manage own shopping items" on public.shopping_items;
drop policy if exists "Users can manage own consumption logs" on public.consumption_logs;
drop policy if exists "Users can manage own favorites" on public.favorites;

drop policy if exists "Members can view own household" on public.households;
drop policy if exists "Members can view household members" on public.household_members;
drop policy if exists "Household members can manage ingredients" on public.ingredients;
drop policy if exists "Household members can manage ingredient aliases" on public.ingredient_aliases;
drop policy if exists "Household members can manage recipes" on public.recipes;
drop policy if exists "Household members can manage recipe ingredients" on public.recipe_ingredients;
drop policy if exists "Household members can manage meal plans" on public.meal_plans;
drop policy if exists "Household members can manage meals" on public.meals;
drop policy if exists "Household members can manage pantry items" on public.pantry_items;
drop policy if exists "Household members can manage shopping lists" on public.shopping_lists;
drop policy if exists "Household members can manage shopping items" on public.shopping_items;
drop policy if exists "Household members can manage consumption logs" on public.consumption_logs;
drop policy if exists "Household members can manage favorites" on public.favorites;

create policy "Members can view own household"
  on public.households for select
  to authenticated
  using (id = (select private.current_household_id()));

create policy "Members can view household members"
  on public.household_members for select
  to authenticated
  using (household_id = (select private.current_household_id()));

create policy "Household members can manage ingredients"
  on public.ingredients for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage ingredient aliases"
  on public.ingredient_aliases for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage recipes"
  on public.recipes for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage recipe ingredients"
  on public.recipe_ingredients for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage meal plans"
  on public.meal_plans for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage meals"
  on public.meals for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage pantry items"
  on public.pantry_items for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage shopping lists"
  on public.shopping_lists for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage shopping items"
  on public.shopping_items for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage consumption logs"
  on public.consumption_logs for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Household members can manage favorites"
  on public.favorites for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

drop function if exists public.set_user_id() cascade;

do $$
declare
  tbl text;
begin
  for tbl in
    select unnest(array[
      'ingredients', 'ingredient_aliases', 'recipes', 'recipe_ingredients',
      'meal_plans', 'meals', 'pantry_items', 'shopping_lists', 'shopping_items',
      'consumption_logs', 'favorites'
    ])
  loop
    execute format(
      'create or replace trigger set_household_id_%I
       before insert on public.%I
       for each row execute function private.set_household_id()',
      tbl, tbl
    );
  end loop;

  for tbl in
    select unnest(array[
      'households', 'household_members', 'profiles', 'ingredients', 'ingredient_aliases',
      'recipes', 'recipe_ingredients', 'meal_plans', 'meals', 'pantry_items',
      'shopping_lists', 'shopping_items', 'consumption_logs', 'favorites'
    ])
  loop
    execute format(
      'create or replace trigger set_updated_at_%I
       before update on public.%I
       for each row execute function public.set_updated_at()',
      tbl, tbl
    );
  end loop;
end;
$$;

alter function public.handle_new_user() set search_path = public;
alter function public.set_updated_at() set search_path = public;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
