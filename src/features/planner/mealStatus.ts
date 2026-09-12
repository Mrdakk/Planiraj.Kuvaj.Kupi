export const MEAL_COOKED_SURFACE = '#EEF2E8';
export const MEAL_PENDING_SURFACE = '#FFFBF6';
export const MEAL_COOKED_SURFACE_PRESSED = '#E2E8D8';
export const MEAL_PENDING_SURFACE_PRESSED = '#F4EFE6';

export function mealSurface(isCooked: boolean): string {
  return isCooked ? MEAL_COOKED_SURFACE : MEAL_PENDING_SURFACE;
}

export function mealSurfacePressed(isCooked: boolean): string {
  return isCooked ? MEAL_COOKED_SURFACE_PRESSED : MEAL_PENDING_SURFACE_PRESSED;
}
