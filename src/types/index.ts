import type { Unit } from '@/constants/units';
import type {
  DishType,
  IngredientCategory,
  GroceryStoreSection,
  MealType,
} from '@/constants/categories';

export type UUID = string;

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Profile extends Timestamps {
  id: UUID;
  email: string | null;
  displayName: string | null;
}

export interface HouseholdState extends Timestamps {
  householdId: UUID;
  memberId: UUID;
  displayName: string;
  joinToken: string;
}

export interface Ingredient extends Timestamps {
  id: UUID;
  name: string;
  category: IngredientCategory;
  defaultUnit: Unit;
  emoji: string | null;
  trackPresence: boolean;
}

export interface IngredientAlias extends Timestamps {
  id: UUID;
  ingredientId: UUID;
  alias: string;
}

export interface Recipe extends Timestamps {
  id: UUID;
  name: string;
  description: string | null;
  imageUri: string | null;
  baseServings: number;
  prepTimeMinutes: number | null;
  mealTypes: MealType[];
  dishType: DishType | null;
  isFavorite: boolean;
  steps: string[];
  notes: string | null;
  emoji: string | null;
}

export interface RecipeIngredient extends Timestamps {
  id: UUID;
  recipeId: UUID;
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
  notes: string | null;
  sortOrder: number;
  ingredientName?: string;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface MealPlan extends Timestamps {
  id: UUID;
  weekStart: string; // ISO date (Monday)
}

export interface Meal extends Timestamps {
  id: UUID;
  mealPlanId: UUID;
  date: string; // ISO date
  mealType: MealType;
  recipeId: UUID;
  servings: number;
  notes: string | null;
  isCooked: boolean;
}

export interface MealWithRecipe extends Meal {
  recipe: Recipe | null;
}

export interface PantryItem extends Timestamps {
  id: UUID;
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
  expiresAt: string | null;
  notes: string | null;
}

export interface PantryItemWithIngredient extends PantryItem {
  ingredient: Ingredient;
}

export interface ShoppingList extends Timestamps {
  id: UUID;
  weekStart: string | null;
  name: string | null;
}

export interface ShoppingItem extends Timestamps {
  id: UUID;
  shoppingListId: UUID;
  ingredientId: UUID | null;
  name: string;
  quantity: number;
  unit: Unit;
  category: GroceryStoreSection;
  isChecked: boolean;
  isManual: boolean;
  sourceMealIds: UUID[];
  notes: string | null;
}

export interface ShoppingItemWithIngredient extends ShoppingItem {
  ingredient: Ingredient | null;
}

export interface ConsumptionLog extends Timestamps {
  id: UUID;
  mealId: UUID;
  ingredientId: UUID;
  quantity: number;
  unit: Unit;
  consumedAt: string;
}

export interface Favorite extends Timestamps {
  id: UUID;
  recipeId: UUID;
}

export interface SyncQueueItem {
  id: UUID;
  tableName: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: UUID;
  payload: string; // JSON
  createdAt: string;
  retryCount: number;
  lastError: string | null;
}

export interface SyncState {
  id: string;
  lastSyncedAt: string | null;
  status: 'idle' | 'syncing' | 'error' | 'offline';
  pendingCount: number;
}

export interface CalculationRequirement {
  ingredientId: UUID;
  unit: Unit;
  quantity: number;
  mealIds: UUID[];
}

export interface CalculationResult {
  ingredientId: UUID;
  requiredQuantity: number;
  requiredUnit: Unit;
  availableQuantity: number;
  availableUnit: Unit;
  missingQuantity: number;
  missingUnit: Unit;
  isMissing: boolean;
  meals: { mealId: UUID; quantity: number; unit: Unit }[];
  trackPresence?: boolean;
}
