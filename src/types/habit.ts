export type HabitSchedule =
  | {
      type: "daily";
    }
  | {
      type: "weekly";
      weekdays: number[];
    };

export type Habit = {
  id: string;
  name: string;
  description?: string;
  requiredCompletion: number;
  schedule: HabitSchedule;
  completions: Record<string, boolean>;
  createdAt: string;
};

export type NewHabitInput = {
  name: string;
  description?: string;
  requiredCompletion: number;
  schedule: HabitSchedule;
};

export type HabitProgress = {
  habit: Habit;
  scheduledDates: string[];
  completedDates: string[];
  missedDates: string[];
  requiredCount: number;
  allowedMisses: number;
  completionRate: number;
  isPassing: boolean;
};

export type HabitDashboard = {
  rangeStart: string;
  rangeEnd: string;
  habits: HabitProgress[];
};
