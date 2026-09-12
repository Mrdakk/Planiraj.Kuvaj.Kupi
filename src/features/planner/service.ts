import { mealPlanRepository, mealRepository } from '@/services/repositories';
import { generateUUID } from '@/lib/uuid';
import { nowISO } from '@/database/repository';
import { formatDisplayDate, formatDisplayDateFromDate, parseISODate, toISODate, todayISO } from '@/lib/dates';
import type { Meal, MealPlan } from '@/types';
import type { MealType } from '@/constants/categories';

export const MEAL_TYPE_PLAN_ORDER: MealType[] = ['Doručak', 'Užina', 'Ručak', 'Večera', 'Desert'];

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as week start
  d.setDate(diff);
  d.setHours(12, 0, 0, 0);
  return toISODate(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseISODate(dateStr) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function getSeedPlanWeekStarts(today: Date = new Date()): string[] {
  const currentWeekStart = getWeekStart(today);
  return [currentWeekStart, addDays(currentWeekStart, 7)];
}

export function getWeekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function weekDayChipLabel(dateISO: string, today = todayISO()): string {
  return dateISO === today ? 'Danas' : formatDayParts(dateISO).day;
}

export function defaultDayForWeek(weekStart: string, today = todayISO()): string {
  const days = getWeekDates(weekStart);
  return days.includes(today) ? today : weekStart;
}

export function compareMealsByPlanOrder(a: Meal, b: Meal): number {
  return MEAL_TYPE_PLAN_ORDER.indexOf(a.mealType) - MEAL_TYPE_PLAN_ORDER.indexOf(b.mealType);
}

export function formatDateLabel(dateStr: string): string {
  const d = parseISODate(dateStr);
  if (!d) return formatDisplayDate(dateStr);
  const days = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];
  return `${days[d.getDay()]} ${formatDisplayDateFromDate(d)}`;
}

export function formatDayParts(dateStr: string): { day: string; date: string } {
  const d = parseISODate(dateStr) ?? new Date();
  const days = ['NED', 'PON', 'UTO', 'SRE', 'ČET', 'PET', 'SUB'];
  return { day: days[d.getDay()], date: formatDisplayDateFromDate(d) };
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISODate(weekStart) ?? new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatDisplayDateFromDate(start)} – ${formatDisplayDateFromDate(end)}`;
}

const MONTH_NAMES = [
  'januar',
  'februar',
  'mart',
  'april',
  'maj',
  'jun',
  'jul',
  'avgust',
  'septembar',
  'oktobar',
  'novembar',
  'decembar',
] as const;

export function formatWeekNavRange(weekStart: string): string {
  const start = parseISODate(weekStart) ?? new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()}. ${MONTH_NAMES[start.getMonth()]}`;
  }
  return `${start.getDate()}. ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()}. ${MONTH_NAMES[end.getMonth()]}`;
}

export function isCurrentWeek(weekStart: string, today = todayISO()): boolean {
  return weekStart === getWeekStart(parseISODate(today) ?? new Date());
}

export function shiftPlanWeek(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

export function weekScreenSubtitle(weekStart: string, today = todayISO()): string {
  const range = formatWeekNavRange(weekStart);
  return isCurrentWeek(weekStart, today) ? `Ova nedelja · ${range}` : range;
}

export function isPastDay(dateISO: string, today = todayISO()): boolean {
  return dateISO < today;
}

export function assertMealDateNotPast(date: string, today = todayISO()): void {
  if (date < today) {
    throw new Error('Obrok se ne može dodati za datum pre današnjeg.');
  }
}

export type MealWriteOptions = {
  allowPast?: boolean;
};

function guardMealDate(date: string, options?: MealWriteOptions): void {
  if (options?.allowPast) return;
  assertMealDateNotPast(date);
}

export async function ensureMealPlan(weekStart: string): Promise<MealPlan> {
  const existing = await mealPlanRepository.findManyWhere('week_start = ?', [weekStart]);
  if (existing.length > 0) return existing[0];

  const plan: MealPlan = {
    id: generateUUID(),
    weekStart,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await mealPlanRepository.insert(plan);
  return plan;
}

export async function addMeal(
  planId: string,
  date: string,
  mealType: MealType,
  recipeId: string,
  servings: number,
  notes?: string,
  options?: MealWriteOptions
): Promise<Meal> {
  guardMealDate(date, options);
  const meal: Meal = {
    id: generateUUID(),
    mealPlanId: planId,
    date,
    mealType,
    recipeId,
    servings,
    notes: notes?.trim() || null,
    isCooked: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await mealRepository.insert(meal);
  return meal;
}

export async function ensureMealPlanForDate(date: string): Promise<MealPlan> {
  const weekStart = getWeekStart(parseISODate(date) ?? new Date());
  return ensureMealPlan(weekStart);
}

export async function copyMeal(
  meal: Meal,
  targetDate: string,
  targetMealType?: MealType,
  options?: MealWriteOptions
): Promise<Meal> {
  guardMealDate(targetDate, options);
  const plan = await ensureMealPlanForDate(targetDate);
  const copy: Meal = {
    ...meal,
    id: generateUUID(),
    mealPlanId: plan.id,
    date: targetDate,
    mealType: targetMealType ?? meal.mealType,
    isCooked: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await mealRepository.insert(copy);
  return copy;
}

export async function moveMeal(
  meal: Meal,
  targetDate: string,
  targetMealType?: MealType,
  options?: MealWriteOptions
): Promise<Meal> {
  guardMealDate(targetDate, options);
  const plan = await ensureMealPlanForDate(targetDate);
  const updated: Meal = {
    ...meal,
    mealPlanId: plan.id,
    date: targetDate,
    mealType: targetMealType ?? meal.mealType,
    updatedAt: nowISO(),
  };
  await mealRepository.update(updated);
  return updated;
}

export function canDeleteMeal(meal: Pick<Meal, 'isCooked'>): boolean {
  return !meal.isCooked;
}

export async function deleteMeal(meal: Meal): Promise<void> {
  if (!canDeleteMeal(meal)) {
    throw new Error('Skuvani obrok se ne može obrisati.');
  }
  await mealRepository.delete(meal.id);
}
