import { mkdir, readFile, writeFile } from "node:fs/promises";
import { PATHS } from "@/config";
import type { SessionEntry, TicketSpent, TicketSpentMap } from "@/types";

async function readSessions(): Promise<SessionEntry[]> {
  const raw = await readFile(PATHS.sessionsFile, "utf8");
  return JSON.parse(raw) as SessionEntry[];
}

function calculateTicketSpent(sessions: SessionEntry[]): TicketSpent[] {
  const spentMap: TicketSpentMap = {};

  for (const session of sessions) {
    const key = session.ticketName;

    if (!spentMap[key]) {
      spentMap[key] = {
        spent: 0,
        sessions: 0,
      };
    }

    spentMap[key].spent += 1;
    spentMap[key].sessions += 1;
  }

  return Object.entries(spentMap)
    .map(([ticketName, stats]) => ({
      ticketName,
      spent: stats.spent,
      sessions: stats.sessions,
    }))
    .sort(
      (a, b) => b.spent - a.spent || a.ticketName.localeCompare(b.ticketName)
    );
}

async function main(): Promise<void> {
  await mkdir(PATHS.generatedDir, { recursive: true });

  const sessions = await readSessions();
  const ticketSpent = calculateTicketSpent(sessions);

  await writeFile(
    PATHS.ticketSpentFile,
    JSON.stringify(ticketSpent, null, 2),
    "utf8"
  );

  console.log(
    `Saved ${ticketSpent.length} ticket stats to ${PATHS.ticketSpentFile}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
