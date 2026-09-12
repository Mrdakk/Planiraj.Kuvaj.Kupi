-- Initial Supabase schema for Planiraj.Kuvaj.Kupi
-- Kitchen data is shared by household. Identity is an anonymous auth user
-- bound to a household member name. Enable Anonymous sign-ins in Auth providers.

create extension if not exists "uuid-ossp";
create schema if not exists private;
grant usage on schema private to postgres, authenticated, service_role;

-- Profiles: extends auth.users with app-specific data.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

create table if not exists public.ingredients (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  category text not null,
  default_unit text not null,
  track_presence boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "Household members can manage ingredients"
  on public.ingredients for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create unique index if not exists idx_ingredients_household_name
  on public.ingredients(household_id, lower(name));

create table if not exists public.ingredient_aliases (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredient_aliases enable row level security;

create policy "Household members can manage ingredient aliases"
  on public.ingredient_aliases for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create table if not exists public.recipes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  description text,
  image_uri text,
  base_servings integer not null default 4,
  prep_time_minutes integer,
  category text,
  meal_types jsonb not null default '[]'::jsonb,
  is_favorite boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "Household members can manage recipes"
  on public.recipes for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create index if not exists idx_recipes_household_id on public.recipes(household_id);

create table if not exists public.recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  recipe_id uuid not null references public.recipes on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete restrict,
  quantity numeric not null,
  unit text not null,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipe_ingredients enable row level security;

create policy "Household members can manage recipe ingredients"
  on public.recipe_ingredients for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create index if not exists idx_recipe_ingredients_recipe_id
  on public.recipe_ingredients(recipe_id);

create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, week_start)
);

alter table public.meal_plans enable row level security;

create policy "Household members can manage meal plans"
  on public.meal_plans for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create table if not exists public.meals (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  meal_plan_id uuid not null references public.meal_plans on delete cascade,
  date date not null,
  meal_type text not null,
  recipe_id uuid not null references public.recipes on delete restrict,
  servings integer not null default 4,
  notes text,
  is_cooked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "Household members can manage meals"
  on public.meals for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create index if not exists idx_meals_plan_date on public.meals(meal_plan_id, date);

create table if not exists public.pantry_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete restrict,
  quantity numeric not null,
  unit text not null,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pantry_items enable row level security;

create policy "Household members can manage pantry items"
  on public.pantry_items for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create index if not exists idx_pantry_items_household_ingredient
  on public.pantry_items(household_id, ingredient_id);

create table if not exists public.shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  week_start date,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create policy "Household members can manage shopping lists"
  on public.shopping_lists for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create table if not exists public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  shopping_list_id uuid not null references public.shopping_lists on delete cascade,
  ingredient_id uuid references public.ingredients on delete set null,
  name text not null,
  quantity numeric not null,
  unit text not null,
  category text not null,
  is_checked boolean not null default false,
  is_manual boolean not null default false,
  source_meal_ids jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;

create policy "Household members can manage shopping items"
  on public.shopping_items for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create index if not exists idx_shopping_items_list_id
  on public.shopping_items(shopping_list_id);

create table if not exists public.consumption_logs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  meal_id uuid not null references public.meals on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete restrict,
  quantity numeric not null,
  unit text not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consumption_logs enable row level security;

create policy "Household members can manage consumption logs"
  on public.consumption_logs for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households on delete cascade,
  recipe_id uuid not null references public.recipes on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, recipe_id)
);

alter table public.favorites enable row level security;

create policy "Household members can manage favorites"
  on public.favorites for all to authenticated
  using (household_id = (select private.current_household_id()))
  with check (household_id = (select private.current_household_id()));

create policy "Members can view own household"
  on public.households for select to authenticated
  using (id = (select private.current_household_id()));

create policy "Members can view household members"
  on public.household_members for select to authenticated
  using (household_id = (select private.current_household_id()));

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

do $$
declare
  tbl text;
begin
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
       for each row execute function public.set_updated_at();',
      tbl, tbl
    );
  end loop;

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
       for each row execute function private.set_household_id();',
      tbl, tbl
    );
  end loop;
end;
$$;

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

revoke all on function private.current_household_id() from public;
revoke all on function private.set_household_id() from public;
revoke all on function private.create_household(text) from public;
revoke all on function private.join_household(uuid, text) from public;
revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(uuid, text) from public;
revoke all on function public.create_household(text) from anon;
revoke all on function public.join_household(uuid, text) from anon;

grant execute on function private.current_household_id() to authenticated, service_role;
grant execute on function private.set_household_id() to authenticated, service_role;
grant execute on function private.create_household(text) to authenticated, service_role;
grant execute on function private.join_household(uuid, text) to authenticated, service_role;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(uuid, text) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

