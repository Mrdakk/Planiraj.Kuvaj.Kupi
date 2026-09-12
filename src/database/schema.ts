/**
 * Local SQLite schema for offline-first storage.
 * Mirrors the Supabase tables where applicable, plus local-only sync tables.
 */

export const LOCAL_DB_NAME = 'pkk.db';

export const schemaV1 = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Profiles (local cache of auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Canonical ingredients
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  default_unit TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

-- Ingredient aliases for normalization
CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id TEXT PRIMARY KEY NOT NULL,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_alias ON ingredient_aliases(alias);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_uri TEXT,
  base_servings INTEGER NOT NULL DEFAULT 4,
  prep_time_minutes INTEGER,
  category TEXT,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  steps TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

-- Meal plans (weeks)
CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY NOT NULL,
  week_start TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_week_start ON meal_plans(week_start);

-- Meals
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY NOT NULL,
  meal_plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
  servings INTEGER NOT NULL DEFAULT 4,
  notes TEXT,
  is_cooked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_meals_plan_date ON meals(meal_plan_id, date);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);

-- Pantry items
CREATE TABLE IF NOT EXISTS pantry_items (
  id TEXT PRIMARY KEY NOT NULL,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  expires_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_pantry_items_ingredient_id ON pantry_items(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pantry_items_expires_at ON pantry_items(expires_at);

-- Shopping lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY NOT NULL,
  week_start TEXT,
  name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

-- Shopping items
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY NOT NULL,
  shopping_list_id TEXT NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_id TEXT REFERENCES ingredients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  category TEXT NOT NULL,
  is_checked INTEGER NOT NULL DEFAULT 0,
  is_manual INTEGER NOT NULL DEFAULT 0,
  source_meal_ids TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_category ON shopping_items(category);

-- Consumption logs
CREATE TABLE IF NOT EXISTS consumption_logs (
  id TEXT PRIMARY KEY NOT NULL,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  consumed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_consumption_logs_meal_id ON consumption_logs(meal_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_favorites_recipe_id ON favorites(recipe_id);

-- Local sync queue (pending changes to push to Supabase)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  record_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);

-- Local sync state
CREATE TABLE IF NOT EXISTS sync_state (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'global',
  last_synced_at TEXT,
  status TEXT NOT NULL DEFAULT 'idle',
  pending_count INTEGER NOT NULL DEFAULT 0
);

-- Default sync state row
INSERT OR IGNORE INTO sync_state (id) VALUES ('global');
`;

export const schemaMigrations: Record<number, string> = {
  1: schemaV1,
  2: `ALTER TABLE recipes ADD COLUMN emoji TEXT;`,
  3: `ALTER TABLE ingredients ADD COLUMN emoji TEXT;`,
  4: `
DELETE FROM shopping_items;
DELETE FROM shopping_lists;
`,
  5: `ALTER TABLE ingredients ADD COLUMN track_presence INTEGER NOT NULL DEFAULT 0;`,
  6: `
ALTER TABLE recipes ADD COLUMN meal_types TEXT NOT NULL DEFAULT '[]';
UPDATE recipes SET meal_types = '["Doručak"]', category = NULL WHERE category = 'Doručak';
UPDATE recipes SET meal_types = '["Užina"]', category = NULL WHERE category = 'Užina';
UPDATE recipes SET meal_types = '["Ručak"]', category = NULL WHERE category = 'Ručak';
UPDATE recipes SET meal_types = '["Večera"]', category = NULL WHERE category = 'Večera';
UPDATE recipes SET meal_types = '["Desert"]', category = 'Slatko' WHERE category = 'Desert';
UPDATE recipes SET meal_types = '["Ručak","Večera"]' WHERE category = 'Glavno jelo';
`,
  7: `
CREATE TABLE IF NOT EXISTS household_state (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'current',
  household_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  join_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`,
};
