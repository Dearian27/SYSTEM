import path from "node:path";

function buildPaths(engineRoot: string) {
  return {
    dashboardDir: path.resolve(engineRoot, "../Dashboard"),
    dashboardFile: path.resolve(engineRoot, "../Dashboard/Sprint-dashboard.md"),
    burndownDashboardFile: path.resolve(engineRoot, "../Dashboard/Burndown.md"),
    burndownSvgFile: path.resolve(engineRoot, "../Dashboard/burndown.svg"),
    excalidrawDir: path.resolve(engineRoot, "../Dashboard"),
    burndownExcalidrawFile: path.resolve(
      engineRoot,
      "../Dashboard/burndown.excalidraw.md"
    ),
    dailyDir: path.resolve(engineRoot, "../Daily Reports"),
    ticketsDir: path.resolve(engineRoot, "../Tickets"),
    sprintsDir: path.resolve(engineRoot, "../Sprints"),
    generatedDir: path.resolve(engineRoot, ".generated"),
    sessionsFile: path.resolve(engineRoot, ".generated/sessions.json"),
    ticketSpentFile: path.resolve(engineRoot, ".generated/ticket-spent.json"),
    ticketStatsFile: path.resolve(engineRoot, ".generated/ticket-stats.json"),
    sprintSummaryFile: path.resolve(
      engineRoot,
      ".generated/sprint-summary.json"
    ),
    burndownFile: path.resolve(engineRoot, ".generated/burndown-data.json"),
  };
}

export let PATHS = buildPaths(process.cwd());

export function setEngineRoot(engineRoot: string): void {
  PATHS = buildPaths(engineRoot);
}

export const HEADINGS = {
  sessions: "## Sessions",
};

// export const SESSION_LINE_REGEX = /^(\d{2}:\d{2})\s*\|\s*\[\[([^\]]+)\]\]$/;
export const SESSION_LINE_REGEX = /^`?(\d{2}:\d{2})`?\s*\|\s*\[\[([^\]]+)\]\]$/;

export const FILE_DATE_REGEX = /\b(\d{4}-\d{2}-\d{2})\b/;
