import { BaseRepository } from '@/database/repository';
import type { SQLiteRecipeRow, SyncStatus } from '@/database/types';
import type { Recipe } from '@/types';
import { isDishType } from '@/constants/categories';
import {
  classifyLegacyRecipeCategory,
  parseMealTypesJson,
} from '@/features/recipes/classification';

const columns = [
  'id',
  'name',
  'description',
  'image_uri',
  'base_servings',
  'prep_time_minutes',
  'category',
  'meal_types',
  'is_favorite',
  'steps',
  'notes',
  'emoji',
  'created_at',
  'updated_at',
  'sync_status',
];

const mapper = {
  fromRow(row: Record<string, unknown>): Recipe {
    const category = row.category ? String(row.category) : null;
    const storedMealTypes = parseMealTypesJson(
      row.meal_types == null ? null : String(row.meal_types)
    );
    const storedDishType = category && isDishType(category) ? category : null;
    const classified =
      storedMealTypes.length > 0
        ? { mealTypes: storedMealTypes, dishType: storedDishType }
        : classifyLegacyRecipeCategory(category);

    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      imageUri: row.image_uri ? String(row.image_uri) : null,
      baseServings: Number(row.base_servings),
      prepTimeMinutes: row.prep_time_minutes ? Number(row.prep_time_minutes) : null,
      mealTypes: classified.mealTypes,
      dishType: storedMealTypes.length > 0 ? storedDishType : classified.dishType,
      isFavorite: Boolean(row.is_favorite),
      steps: JSON.parse(String(row.steps ?? '[]')),
      notes: row.notes ? String(row.notes) : null,
      emoji: row.emoji ? String(row.emoji) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  },
  toRow(entity: Recipe): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      image_uri: entity.imageUri,
      base_servings: entity.baseServings,
      prep_time_minutes: entity.prepTimeMinutes,
      category: entity.dishType,
      meal_types: JSON.stringify(entity.mealTypes),
      is_favorite: entity.isFavorite ? 1 : 0,
      steps: JSON.stringify(entity.steps),
      notes: entity.notes,
      emoji: entity.emoji,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      sync_status: 'pending' as SyncStatus,
    };
  },
};

export const recipeRepository = new BaseRepository<Recipe>({
  tableName: 'recipes',
  columns,
  mapper,
});

export function recipeFromRow(row: SQLiteRecipeRow): Recipe {
  return mapper.fromRow(row as unknown as Record<string, unknown>);
}

export function recipeToRow(entity: Recipe): SQLiteRecipeRow {
  return mapper.toRow(entity) as unknown as SQLiteRecipeRow;
}
