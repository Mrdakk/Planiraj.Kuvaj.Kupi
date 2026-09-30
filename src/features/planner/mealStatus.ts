import { colors } from '@/constants/theme';

export function mealSurface(isCooked: boolean): string {
  return isCooked ? colors.cookedSurface : colors.surface;
}

export function mealSurfacePressed(isCooked: boolean): string {
  return isCooked ? colors.cookedSurfacePressed : colors.surfacePressed;
}
