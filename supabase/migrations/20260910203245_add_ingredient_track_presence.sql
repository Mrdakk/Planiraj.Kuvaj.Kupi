alter table public.ingredients
  add column if not exists track_presence boolean not null default false;
