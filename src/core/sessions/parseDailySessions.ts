import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { HEADINGS, PATHS, SESSION_LINE_REGEX } from "@/config";
import type { SessionEntry } from "@/types";
import { extractDateFromFileName } from "@/utils";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSessionsBlock(content: string): string | null {
  const escapedHeading = escapeRegex(HEADINGS.sessions);
  const regex = new RegExp(`${escapedHeading}\\s*([\\s\\S]*?)(\\n## |\\n# |$)`);
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function parseSessionLines(
  block: string,
  date: string,
  sourceFile: string
): SessionEntry[] {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sessions: SessionEntry[] = [];

  for (const line of lines) {
    const match = line.match(SESSION_LINE_REGEX);
    if (!match) continue;

    const [, time, ticketName] = match;

    sessions.push({
      date,
      time,
      ticketName,
      sourceFile,
    });
  }

  return sessions;
}

export async function parseDailySessions(): Promise<SessionEntry[]> {
  await mkdir(PATHS.generatedDir, { recursive: true });

  const files = await readdir(PATHS.dailyDir);
  const mdFiles = files.filter((file) => file.endsWith(".md"));
  const allSessions: SessionEntry[] = [];

  for (const fileName of mdFiles) {
    const fullPath = path.join(PATHS.dailyDir, fileName);
    const content = await readFile(fullPath, "utf8");

    const sessionsBlock = extractSessionsBlock(content);
    if (!sessionsBlock) continue;

    const date = extractDateFromFileName(fileName);
    const sessions = parseSessionLines(sessionsBlock, date, fileName);
    allSessions.push(...sessions);
  }

  await writeFile(
    PATHS.sessionsFile,
    JSON.stringify(allSessions, null, 2),
    "utf8"
  );
  console.log(`Saved ${allSessions.length} sessions to ${PATHS.sessionsFile}`);
  return allSessions;
}
