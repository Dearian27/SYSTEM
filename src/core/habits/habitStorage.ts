import { PATHS } from "@/config";
import { buildHabitDashboard } from "@/core/habits/habitProgress";
import type { Habit, HabitDashboard, NewHabitInput } from "@/types/habit";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type HabitStore = {
  version: 1;
  habits: Habit[];
};

const EMPTY_STORE: HabitStore = {
  version: 1,
  habits: [],
};

export async function loadHabitDashboard(
  today?: string,
  windowDays = 7
): Promise<HabitDashboard> {
  const store = await loadHabitStore();
  return buildHabitDashboard(store.habits, today, windowDays);
}

export async function createHabit(input: NewHabitInput): Promise<Habit> {
  const store = await loadHabitStore();
  const habit: Habit = {
    id: createHabitId(input.name),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    requiredCompletion: normalizeRequiredCompletion(input.requiredCompletion),
    schedule: input.schedule,
    completions: {},
    createdAt: new Date().toISOString(),
  };

  store.habits.push(habit);
  await saveHabitStore(store);
  return habit;
}

export async function toggleHabitCompletion(
  habitId: string,
  date: string
): Promise<Habit | null> {
  const store = await loadHabitStore();
  const habit = store.habits.find((item) => item.id === habitId);

  if (!habit) {
    return null;
  }

  if (habit.completions[date]) {
    delete habit.completions[date];
  } else {
    habit.completions[date] = true;
  }

  await saveHabitStore(store);
  return habit;
}

export async function loadHabitStore(): Promise<HabitStore> {
  try {
    const raw = await readFile(PATHS.habitsFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<HabitStore>;

    if (!Array.isArray(parsed.habits)) {
      return createEmptyStore();
    }

    return {
      version: 1,
      habits: parsed.habits.map(normalizeHabit),
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return createEmptyStore();
    }

    throw error;
  }
}

function createEmptyStore(): HabitStore {
  return {
    version: EMPTY_STORE.version,
    habits: [],
  };
}

async function saveHabitStore(store: HabitStore): Promise<void> {
  await mkdir(path.dirname(PATHS.habitsFile), { recursive: true });
  await writeFile(PATHS.habitsFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeHabit(habit: Habit): Habit {
  return {
    ...habit,
    name: habit.name.trim(),
    requiredCompletion: normalizeRequiredCompletion(habit.requiredCompletion),
    completions: habit.completions ?? {},
  };
}

function normalizeRequiredCompletion(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
}

function createHabitId(name: string): string {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "habit";

  return `${slug}-${Date.now().toString(36)}`;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
