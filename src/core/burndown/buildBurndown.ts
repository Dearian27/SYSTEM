import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";
import { readSprints } from "@/utils/readSprints";
import { normalizeDate } from "@/utils/normalizeDate";
import type {
  BurndownData,
  BurndownPoint,
  SessionEntry,
  SprintConfig,
  SprintSummary,
} from "@/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

function findCurrentSprint(sprints: SprintConfig[]): SprintConfig | undefined {
  const now = today();

  return sprints.find((sprint) => {
    const start = normalizeDate(sprint.start);
    const end = normalizeDate(sprint.end);
    return isDateInRange(now, start, end);
  });
}

async function readSessions(): Promise<SessionEntry[]> {
  const raw = await readFile(PATHS.sessionsFile, "utf8");
  return JSON.parse(raw) as SessionEntry[];
}

async function readSprintSummary(): Promise<SprintSummary> {
  const raw = await readFile(PATHS.sprintSummaryFile, "utf8");
  return JSON.parse(raw) as SprintSummary;
}

function getDateRange(start: string, end: string): string[] {
  const result: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  while (current <= endDate) {
    result.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function buildSpentPerDayMap(sessions: SessionEntry[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const session of sessions) {
    const current = map.get(session.date) ?? 0;
    map.set(session.date, current + 1);
  }

  return map;
}

function buildPoints(
  dates: string[],
  spentPerDay: Map<string, number>,
  baseline: number
): BurndownPoint[] {
  const points: BurndownPoint[] = [];
  let cumulativeSpent = 0;

  for (const date of dates) {
    const spentToday = spentPerDay.get(date) ?? 0;
    cumulativeSpent += spentToday;

    points.push({
      date,
      spentToday,
      cumulativeSpent,
      remaining: Math.max(baseline - cumulativeSpent, 0),
    });
  }

  return points;
}

function renderAsciiBurndown(
  points: BurndownPoint[],
  baseline: number
): string {
  if (points.length === 0) return "No burndown data";

  const maxBarWidth = 24;

  return points
    .map((point) => {
      const ratio = baseline > 0 ? point.remaining / baseline : 0;
      const barLength = Math.round(ratio * maxBarWidth);
      const bar = "█".repeat(barLength);
      return `${point.date} | ${bar.padEnd(maxBarWidth, " ")} ${
        point.remaining
      }`;
    })
    .join("\n");
}

export async function buildBurndown(): Promise<BurndownData | null> {
  await mkdir(PATHS.generatedDir, { recursive: true });
  await mkdir(PATHS.dashboardDir, { recursive: true });

  const [sprints, allSessions, sprintSummary] = await Promise.all([
    readSprints(),
    readSessions(),
    readSprintSummary(),
  ]);

  const currentSprint = findCurrentSprint(sprints);

  if (!currentSprint) {
    console.log("No active sprint found");
    return null;
  }

  const sprintSessions = allSessions.filter((session) =>
    isDateInRange(session.date, currentSprint.start, currentSprint.end)
  );

  const dates = getDateRange(currentSprint.start, currentSprint.end);
  const spentPerDay = buildSpentPerDayMap(sprintSessions);
  const baseline = currentSprint.capacity ?? sprintSummary.totalEstimate;
  const points = buildPoints(dates, spentPerDay, baseline);
  const visiblePoints = points.filter((point) => point.date <= today());

  const burndownData: BurndownData = {
    sprintName: currentSprint.name,
    start: currentSprint.start,
    end: currentSprint.end,
    capacity: currentSprint.capacity ?? null,
    baseline,
    totalEstimate: sprintSummary.totalEstimate,
    points,
  };

  await writeFile(
    PATHS.burndownFile,
    JSON.stringify(burndownData, null, 2),
    "utf8"
  );

  const asciiChart = renderAsciiBurndown(visiblePoints, baseline);
  const markdown = `## Sprint
**${currentSprint.name}**

${currentSprint.start} → ${currentSprint.end}

Sprint capacity: **${currentSprint.capacity ?? "N/A"}**

Burndown baseline: **${baseline}**

Total estimate: **${sprintSummary.totalEstimate}**

## ASCII Chart

\`\`\`
${asciiChart}
\`\`\`

## Table

| Date | Spent Today | Cumulative Spent | Remaining |
|------|-------------|------------------|-----------|
${visiblePoints
  .map(
    (p) =>
      `| ${p.date} | ${p.spentToday} | ${p.cumulativeSpent} | ${p.remaining} |`
  )
  .join("\n")}
`;

  await writeFile(PATHS.burndownDashboardFile, markdown, "utf8");

  console.log(`Burndown data saved to ${PATHS.burndownFile}`);
  console.log(`Burndown dashboard saved to ${PATHS.burndownDashboardFile}`);
  return burndownData;
}
