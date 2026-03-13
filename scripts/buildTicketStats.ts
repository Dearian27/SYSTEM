import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";
import { readTickets } from "@/utils";
import type { TicketSpent, TicketStats } from "@/types";

async function readTicketSpent(): Promise<TicketSpent[]> {
  const raw = await readFile(PATHS.ticketSpentFile, "utf8");
  return JSON.parse(raw) as TicketSpent[];
}

function buildSpentLookup(
  ticketSpent: TicketSpent[]
): Map<string, TicketSpent> {
  return new Map(ticketSpent.map((item) => [item.ticketName, item]));
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

function calculateRemaining(
  estimate: number | null,
  spent: number
): number | null {
  if (estimate === null) return null;
  return Math.max(estimate - spent, 0);
}

async function main(): Promise<void> {
  await mkdir(PATHS.generatedDir, { recursive: true });

  const [tickets, ticketSpent] = await Promise.all([
    readTickets(),
    readTicketSpent(),
  ]);

  const spentLookup = buildSpentLookup(ticketSpent);

  const stats: TicketStats[] = tickets.map((ticket) => {
    const spentData = spentLookup.get(ticket.ticketName);

    const spent = spentData?.spent ?? 0;
    const sessions = spentData?.sessions ?? 0;
    const estimate = normalizeEstimate(ticket.frontmatter.estimate);

    return {
      ticketName: ticket.ticketName,
      fileName: ticket.fileName,
      filePath: ticket.filePath,
      area: ticket.frontmatter.area ?? null,
      status: ticket.frontmatter.status ?? null,
      sprint: ticket.frontmatter.sprint ?? null,
      ticketType: ticket.frontmatter.ticket_type ?? null,
      estimate,
      spent,
      sessions,
      remaining: calculateRemaining(estimate, spent),
    };
  });

  stats.sort((a, b) => a.ticketName.localeCompare(b.ticketName));

  await writeFile(
    PATHS.ticketStatsFile,
    JSON.stringify(stats, null, 2),
    "utf8"
  );

  console.log(`Saved ${stats.length} ticket stats to ${PATHS.ticketStatsFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
