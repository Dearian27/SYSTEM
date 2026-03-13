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
  totalEstimate: number;
  points: BurndownPoint[];
};
