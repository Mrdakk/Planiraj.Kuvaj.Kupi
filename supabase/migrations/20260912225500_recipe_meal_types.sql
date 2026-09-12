alter table public.recipes
  add column if not exists meal_types jsonb not null default '[]'::jsonb;

update public.recipes
set meal_types = '["Doručak"]'::jsonb, category = null
where category = 'Doručak';

update public.recipes
set meal_types = '["Užina"]'::jsonb, category = null
where category = 'Užina';

update public.recipes
set meal_types = '["Ručak"]'::jsonb, category = null
where category = 'Ručak';

update public.recipes
set meal_types = '["Večera"]'::jsonb, category = null
where category = 'Večera';

update public.recipes
set meal_types = '["Desert"]'::jsonb, category = 'Slatko'
where category = 'Desert';

update public.recipes
set meal_types = '["Ručak","Večera"]'::jsonb
where category = 'Glavno jelo';
