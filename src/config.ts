import path from "node:path";

export const PATHS = {
  //? UI related paths
  dashboardDir: path.resolve("../Dashboard"),
  dashboardFile: path.resolve("../Dashboard/Sprint-dashboard.md"),
  burndownDashboardFile: path.resolve("../Dashboard/Burndown.md"),
  burndownSvgFile: path.resolve("../Dashboard/burndown.svg"),
  excalidrawDir: path.resolve("../Dashboard"),
  burndownExcalidrawFile: path.resolve("../Dashboard/burndown.excalidraw.md"),

  dailyDir: path.resolve("../Daily Reports"),
  ticketsDir: path.resolve("../Tickets"),
  sprintsDir: path.resolve("../Sprints"),

  //? Code related paths
  generatedDir: path.resolve(".generated"),

  sessionsFile: path.resolve(".generated/sessions.json"),
  ticketSpentFile: path.resolve(".generated/ticket-spent.json"),
  ticketStatsFile: path.resolve(".generated/ticket-stats.json"),
  sprintSummaryFile: path.resolve(".generated/sprint-summary.json"),
  burndownFile: path.resolve(".generated/burndown-data.json"),
};

export const HEADINGS = {
  sessions: "## Sessions",
};

// export const SESSION_LINE_REGEX = /^(\d{2}:\d{2})\s*\|\s*\[\[([^\]]+)\]\]$/;
export const SESSION_LINE_REGEX = /^`?(\d{2}:\d{2})`?\s*\|\s*\[\[([^\]]+)\]\]$/;

export const FILE_DATE_REGEX = /\b(\d{4}-\d{2}-\d{2})\b/;
