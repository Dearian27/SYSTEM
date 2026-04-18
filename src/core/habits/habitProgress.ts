import type {
  Habit,
  HabitDashboard,
  HabitProgress,
  HabitSchedule,
} from "@/types/habit";

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildHabitDashboard(
  habits: Habit[],
  today = toDateString(new Date()),
  windowDays = 7
): HabitDashboard {
  const rangeEnd = today;
  const rangeStart = addDays(today, -(windowDays - 1));

  return {
    rangeStart,
    rangeEnd,
    habits: habits.map((habit) => buildHabitProgress(habit, rangeStart, rangeEnd)),
  };
}

export function buildHabitProgress(
  habit: Habit,
  rangeStart: string,
  rangeEnd: string
): HabitProgress {
  const habitStart = toDateString(new Date(habit.createdAt));
  const effectiveStart = maxDateString(rangeStart, habitStart);
  const scheduledDates = enumerateDates(effectiveStart, rangeEnd).filter(
    (date) => isScheduledOn(habit.schedule, date)
  );
  const completedDates = scheduledDates.filter(
    (date) => habit.completions[date] === true
  );
  const missedDates = scheduledDates.filter(
    (date) => habit.completions[date] !== true
  );
  const requiredCount = Math.ceil(
    scheduledDates.length * clampCompletion(habit.requiredCompletion)
  );
  const allowedMisses = Math.max(0, scheduledDates.length - requiredCount);
  const completionRate =
    scheduledDates.length === 0 ? 1 : completedDates.length / scheduledDates.length;

  return {
    habit,
    scheduledDates,
    completedDates,
    missedDates,
    requiredCount,
    allowedMisses,
    completionRate,
    isPassing: completedDates.length >= requiredCount,
  };
}

export function isScheduledOn(schedule: HabitSchedule, date: string): boolean {
  if (schedule.type === "daily") {
    return true;
  }

  const weekday = getUtcWeekday(date);
  return schedule.weekdays.includes(weekday);
}

export function enumerateDates(rangeStart: string, rangeEnd: string): string[] {
  const dates: string[] = [];
  let cursor = parseDate(rangeStart);
  const end = parseDate(rangeEnd);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(toDateString(cursor));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }

  return dates;
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return toDateString(new Date(parseDate(date).getTime() + days * DAY_MS));
}

function maxDateString(a: string, b: string): string {
  return a > b ? a : b;
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function getUtcWeekday(date: string): number {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

function clampCompletion(value: number): number {
  return Math.min(1, Math.max(0, value));
}
