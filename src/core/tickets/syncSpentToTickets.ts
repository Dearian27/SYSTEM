import { readFile, writeFile } from "node:fs/promises";
import matter from "gray-matter";
import { PATHS } from "@/config";
import { readTickets } from "@/utils/readTickets";
import type { TicketStats } from "@/types";

async function readTicketStats(): Promise<TicketStats[]> {
  const raw = await readFile(PATHS.ticketStatsFile, "utf8");
  return JSON.parse(raw) as TicketStats[];
}

function buildTicketStatsLookup(
  ticketStats: TicketStats[]
): Map<string, TicketStats> {
  return new Map(ticketStats.map((ticket) => [ticket.ticketName, ticket]));
}

export async function syncSpentToTickets(): Promise<number> {
  const [tickets, ticketStats] = await Promise.all([
    readTickets(),
    readTicketStats(),
  ]);

  const ticketStatsLookup = buildTicketStatsLookup(ticketStats);

  let updatedCount = 0;

  for (const ticket of tickets) {
    const stat = ticketStatsLookup.get(ticket.ticketName);
    if (!stat) continue;

    const fileContent = await readFile(ticket.filePath, "utf8");
    const parsed = matter(fileContent);

    const currentSpent = parsed.data.spent;
    const nextSpent = stat.spent;

    if (currentSpent === nextSpent) {
      continue;
    }

    parsed.data.spent = nextSpent;

    const updatedContent = matter.stringify(parsed.content, parsed.data);
    await writeFile(ticket.filePath, updatedContent, "utf8");

    updatedCount += 1;
  }

  console.log(`Updated spent in ${updatedCount} ticket files`);
  return updatedCount;
}
