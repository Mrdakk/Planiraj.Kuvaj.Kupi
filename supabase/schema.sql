-- Initial Supabase schema for Planiraj.Kuvaj.Kupi
-- All tables have RLS enabled. Users can only access their own rows.

-- UUID extension is already enabled in Supabase, but we keep this for portability.
create extension if not exists "uuid-ossp";

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

-- Trigger to auto-create profile on signup.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Canonical ingredients (global read-only + user-created).
-- Initially all ingredients are per-user. A global template system can be added later.
create table if not exists public.ingredients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  category text not null,
  default_unit text not null,
  track_presence boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "Users can manage own ingredients"
  on public.ingredients
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create unique index if not exists idx_ingredients_user_name
  on public.ingredients(user_id, lower(name));

-- Ingredient aliases for natural-language normalization.
create table if not exists public.ingredient_aliases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete cascade,
  alias text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredient_aliases enable row level security;

create policy "Users can manage own ingredient aliases"
  on public.ingredient_aliases
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recipes.
create table if not exists public.recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  description text,
  image_uri text,
  base_servings integer not null default 4,
  prep_time_minutes integer,
  category text,
  is_favorite boolean not null default false,
  steps jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;

create policy "Users can manage own recipes"
  on public.recipes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recipes_user_id on public.recipes(user_id);

-- Recipe ingredients.
create table if not exists public.recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
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

create policy "Users can manage own recipe ingredients"
  on public.recipe_ingredients
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_recipe_ingredients_recipe_id
  on public.recipe_ingredients(recipe_id);

-- Meal plans (weeks).
create table if not exists public.meal_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.meal_plans enable row level security;

create policy "Users can manage own meal plans"
  on public.meal_plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Meals.
create table if not exists public.meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
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

create policy "Users can manage own meals"
  on public.meals
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_meals_plan_date on public.meals(meal_plan_id, date);

-- Pantry items.
create table if not exists public.pantry_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete restrict,
  quantity numeric not null,
  unit text not null,
  expires_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pantry_items enable row level security;

create policy "Users can manage own pantry items"
  on public.pantry_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_pantry_items_user_ingredient
  on public.pantry_items(user_id, ingredient_id);

-- Shopping lists.
create table if not exists public.shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create policy "Users can manage own shopping lists"
  on public.shopping_lists
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Shopping items.
create table if not exists public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
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

create policy "Users can manage own shopping items"
  on public.shopping_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_shopping_items_list_id
  on public.shopping_items(shopping_list_id);

-- Consumption logs.
create table if not exists public.consumption_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  meal_id uuid not null references public.meals on delete cascade,
  ingredient_id uuid not null references public.ingredients on delete restrict,
  quantity numeric not null,
  unit text not null,
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.consumption_logs enable row level security;

create policy "Users can manage own consumption logs"
  on public.consumption_logs
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Favorites.
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users on delete cascade,
  recipe_id uuid not null references public.recipes on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, recipe_id)
);

alter table public.favorites enable row level security;

create policy "Users can manage own favorites"
  on public.favorites
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Helper function to automatically set user_id on insert (optional, for convenience).
create or replace function public.set_user_id()
returns trigger as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$ language plpgsql security definer;

-- Generic updated_at trigger.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

-- Apply updated_at triggers to all tables with updated_at column.
do $$
declare
  tbl text;
begin
  for tbl in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'profiles', 'ingredients', 'ingredient_aliases', 'recipes',
        'recipe_ingredients', 'meal_plans', 'meals', 'pantry_items',
        'shopping_lists', 'shopping_items', 'consumption_logs', 'favorites'
      )
  loop
    execute format(
      'create or replace trigger set_updated_at_%I
       before update on public.%I
       for each row execute function public.set_updated_at();',
      tbl, tbl
    );
  end loop;
end;
$$;

-- Apply set_user_id triggers to all tables with user_id column (except profiles).
do $$
declare
  tbl text;
begin
  for tbl in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'ingredients', 'ingredient_aliases', 'recipes', 'recipe_ingredients',
        'meal_plans', 'meals', 'pantry_items', 'shopping_lists', 'shopping_items',
        'consumption_logs', 'favorites'
      )
  loop
    execute format(
      'create or replace trigger set_user_id_%I
       before insert on public.%I
       for each row execute function public.set_user_id();',
      tbl, tbl
    );
  end loop;
end;
$$;
