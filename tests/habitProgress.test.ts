import { describe, expect, it } from "vitest";
import { buildHabitProgress, isScheduledOn } from "@/core/habits/habitProgress";
import type { Habit } from "@/types/habit";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "brush-teeth",
    name: "Brush Teeth",
    requiredCompletion: 0.8,
    schedule: { type: "daily" },
    completions: {},
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("habit progress", () => {
  it("converts an 80% weekly habit into one allowed miss", () => {
    const progress = buildHabitProgress(
      habit({
        completions: {
          "2026-04-13": true,
          "2026-04-14": true,
          "2026-04-15": true,
          "2026-04-16": true,
          "2026-04-17": true,
          "2026-04-18": true,
        },
      }),
      "2026-04-13",
      "2026-04-19"
    );

    expect(progress.scheduledDates).toHaveLength(7);
    expect(progress.requiredCount).toBe(6);
    expect(progress.allowedMisses).toBe(1);
    expect(progress.isPassing).toBe(true);
  });

  it("fails strict 100% challenge habits after a missed scheduled day", () => {
    const progress = buildHabitProgress(
      habit({
        requiredCompletion: 1,
        completions: {
          "2026-04-13": true,
          "2026-04-14": true,
        },
      }),
      "2026-04-13",
      "2026-04-15"
    );

    expect(progress.requiredCount).toBe(3);
    expect(progress.allowedMisses).toBe(0);
    expect(progress.isPassing).toBe(false);
  });

  it("supports weekday schedules without counting weekends as misses", () => {
    const progress = buildHabitProgress(
      habit({
        requiredCompletion: 1,
        schedule: { type: "weekly", weekdays: [1, 2, 3, 4, 5] },
        completions: {
          "2026-04-13": true,
          "2026-04-14": true,
          "2026-04-15": true,
          "2026-04-16": true,
          "2026-04-17": true,
        },
      }),
      "2026-04-13",
      "2026-04-19"
    );

    expect(progress.scheduledDates).toEqual([
      "2026-04-13",
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
    ]);
    expect(progress.isPassing).toBe(true);
  });

  it("checks weekly schedule membership using ISO weekdays", () => {
    expect(
      isScheduledOn({ type: "weekly", weekdays: [6, 7] }, "2026-04-18")
    ).toBe(true);
    expect(
      isScheduledOn({ type: "weekly", weekdays: [6, 7] }, "2026-04-20")
    ).toBe(false);
  });

  it("does not count dates before the habit was created", () => {
    const progress = buildHabitProgress(
      habit({
        createdAt: "2026-04-17T12:00:00.000Z",
        completions: {
          "2026-04-17": true,
        },
      }),
      "2026-04-13",
      "2026-04-19"
    );

    expect(progress.scheduledDates).toEqual([
      "2026-04-17",
      "2026-04-18",
      "2026-04-19",
    ]);
    expect(progress.requiredCount).toBe(3);
  });
});
