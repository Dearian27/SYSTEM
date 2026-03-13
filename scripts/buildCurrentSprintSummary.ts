import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";
import { readSprints } from "@/utils/readSprints";
import { readTickets } from "@/utils/readTickets";
import { normalizeDate } from "@/utils/normalizeDate";
import type {
  SessionEntry,
  SprintConfig,
  SprintSummary,
  SprintTicketStats,
  TicketFile,
  TicketStats,
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

async function readTicketStats(): Promise<TicketStats[]> {
  const raw = await readFile(PATHS.ticketStatsFile, "utf8");
  return JSON.parse(raw) as TicketStats[];
}

function groupSprintSessionsByTicket(
  sessions: SessionEntry[]
): Map<string, { spent: number; sessions: number }> {
  const map = new Map<string, { spent: number; sessions: number }>();

  for (const session of sessions) {
    const key = session.ticketName;
    const current = map.get(key);

    if (current) {
      current.spent += 1;
      current.sessions += 1;
    } else {
      map.set(key, {
        spent: 1,
        sessions: 1,
      });
    }
  }

  return map;
}

function buildTicketFileLookup(tickets: TicketFile[]): Map<string, TicketFile> {
  return new Map(tickets.map((ticket) => [ticket.ticketName, ticket]));
}

function buildTicketStatsLookup(
  ticketStats: TicketStats[]
): Map<string, TicketStats> {
  return new Map(ticketStats.map((ticket) => [ticket.ticketName, ticket]));
}

function normalizeEstimate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildSprintTicketStats(
  sprintSessionMap: Map<string, { spent: number; sessions: number }>,
  ticketFileLookup: Map<string, TicketFile>,
  ticketStatsLookup: Map<string, TicketStats>
): SprintTicketStats[] {
  const result: SprintTicketStats[] = [];

  for (const [ticketName, sprintEffort] of sprintSessionMap.entries()) {
    const ticketFile = ticketFileLookup.get(ticketName);
    const ticketStat = ticketStatsLookup.get(ticketName);

    const estimate =
      ticketStat?.estimate ??
      normalizeEstimate(ticketFile?.frontmatter?.estimate);

    result.push({
      ticketName,
      fileName: ticketFile?.fileName ?? null,
      filePath: ticketFile?.filePath ?? null,
      area: ticketStat?.area ?? ticketFile?.frontmatter?.area ?? null,
      status: ticketStat?.status ?? ticketFile?.frontmatter?.status ?? null,
      estimate,
      spent: sprintEffort.spent,
      sessions: sprintEffort.sessions,
      remaining: ticketStat?.remaining ?? null,
    });
  }

  return result.sort((a, b) => a.ticketName.localeCompare(b.ticketName));
}

function sumEstimate(tickets: SprintTicketStats[]): number {
  return tickets.reduce((acc, ticket) => acc + (ticket.estimate ?? 0), 0);
}

function sumSpent(tickets: SprintTicketStats[]): number {
  return tickets.reduce((acc, ticket) => acc + ticket.spent, 0);
}

function sumRemaining(tickets: SprintTicketStats[]): number {
  return tickets.reduce((acc, ticket) => acc + (ticket.remaining ?? 0), 0);
}

function buildStatusStats(
  tickets: SprintTicketStats[]
): Record<string, number> {
  const map: Record<string, number> = {};

  for (const ticket of tickets) {
    const status = ticket.status ?? "unknown";
    map[status] ??= 0;
    map[status] += 1;
  }

  return map;
}

function buildAreaStats(tickets: SprintTicketStats[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const ticket of tickets) {
    const area = ticket.area ?? "unknown";
    map[area] ??= 0;
    map[area] += ticket.spent;
  }

  return map;
}

async function main(): Promise<void> {
  await mkdir(PATHS.generatedDir, { recursive: true });

  const [sprints, allSessions, allTickets, allTicketStats] = await Promise.all([
    readSprints(),
    readSessions(),
    readTickets(),
    readTicketStats(),
  ]);

  const currentSprint = findCurrentSprint(sprints);

  if (!currentSprint) {
    console.log("No active sprint found");
    return;
  }
  const sprintSessions = allSessions.filter((session) =>
    isDateInRange(session.date, currentSprint.start, currentSprint.end)
  );

  const sprintSessionMap = groupSprintSessionsByTicket(sprintSessions);
  const ticketFileLookup = buildTicketFileLookup(allTickets);
  const ticketStatsLookup = buildTicketStatsLookup(allTicketStats);

  const sprintTickets = buildSprintTicketStats(
    sprintSessionMap,
    ticketFileLookup,
    ticketStatsLookup
  );

  const summary: SprintSummary = {
    sprintName: currentSprint.name,
    start: currentSprint.start,
    end: currentSprint.end,
    capacity: currentSprint.capacity ?? null,

    totalEstimate: sumEstimate(sprintTickets),
    totalSpent: sumSpent(sprintTickets),
    totalRemaining: sumRemaining(sprintTickets),

    ticketCount: sprintTickets.length,

    ticketsByStatus: buildStatusStats(sprintTickets),
    effortByArea: buildAreaStats(sprintTickets),

    tickets: sprintTickets,
  };

  await writeFile(
    PATHS.sprintSummaryFile,
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  console.log(`Sprint summary saved to ${PATHS.sprintSummaryFile}`);
  console.log(
    `Active sprint: ${summary.sprintName}, sessions: ${sprintSessions.length}, tickets: ${summary.ticketCount}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
