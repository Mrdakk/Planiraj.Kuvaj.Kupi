export const MEAL_COOKED_SURFACE = '#F0FDF4';
export const MEAL_PENDING_SURFACE = '#FFF7ED';
export const MEAL_COOKED_SURFACE_PRESSED = '#DCFCE7';
export const MEAL_PENDING_SURFACE_PRESSED = '#FFEDD5';

export function mealSurface(isCooked: boolean): string {
  return isCooked ? MEAL_COOKED_SURFACE : MEAL_PENDING_SURFACE;
}

export function mealSurfacePressed(isCooked: boolean): string {
  return isCooked ? MEAL_COOKED_SURFACE_PRESSED : MEAL_PENDING_SURFACE_PRESSED;
}
