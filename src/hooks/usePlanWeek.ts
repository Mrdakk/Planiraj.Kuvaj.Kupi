import { useAppStore } from '@/store/appStore';
import {
  getWeekStart,
  isCurrentWeek,
  shiftPlanWeek,
} from '@/features/planner/service';

export function usePlanWeek() {
  const weekStart = useAppStore((state) => state.planWeekStart);
  const setPlanWeekStart = useAppStore((state) => state.setPlanWeekStart);

  return {
    weekStart,
    isThisWeek: isCurrentWeek(weekStart),
    goPreviousWeek: () => setPlanWeekStart(shiftPlanWeek(weekStart, -1)),
    goNextWeek: () => setPlanWeekStart(shiftPlanWeek(weekStart, 1)),
    goThisWeek: () => setPlanWeekStart(getWeekStart(new Date())),
  };
}
