export type BurndownPoint = {
  date: string;
  spentToday: number;
  cumulativeSpent: number;
  remaining: number;
};

export type BurndownData = {
  sprintName: string;
  start: string;
  end: string;
  capacity: number | null;
  baseline: number;
  totalEstimate: number;
  points: BurndownPoint[];
};
