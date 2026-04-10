export type SessionEntry = {
  date: string;
  time: string;
  ticketName: string;
  sourceFile: string;
};

export enum ViewMode {
  PLAN = "plan",
  ACTUAL = "actual",
  COMPARE = "compare",
}
