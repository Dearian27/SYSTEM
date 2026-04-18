import { HEADINGS, SESSION_LINE_REGEX } from "@/config";

type SessionSectionKey = keyof Pick<typeof HEADINGS, "plan" | "sessions">;

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSectionMap(
  content: string,
  heading: string
): Map<string, string> {
  const map = new Map<string, string>();
  const escapedHeading = escapeRegex(heading);
  const regex = new RegExp(`${escapedHeading}\\s*([\\s\\S]*?)(\\n## |\\n# |$)`);
  const match = content.match(regex);
  const block = match?.[1]?.trim() ?? "";

  for (const rawLine of block.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = line.match(SESSION_LINE_REGEX);
    if (!parsed) continue;
    map.set(parsed[1], parsed[2]);
  }

  return map;
}

function updateSection(
  content: string,
  sessionMap: Map<string, string>,
  heading: string
): string {
  const lines = [...sessionMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, ticketName]) => `\`${time}\` | [[${ticketName}]]`);
  const section = `${heading}\n${lines.join("\n")}`.trimEnd();
  const escapedHeading = escapeRegex(heading);
  const regex = new RegExp(
    `(^|\\n)${escapedHeading}(?:\\n[\\s\\S]*?)?(?=\\n## |\\n# |$)`
  );

  if (regex.test(content)) {
    return content.replace(regex, (_match, prefix: string) => `${prefix}${section}`);
  }

  // Keep plan visually and semantically before sessions when adding it later.
  if (heading === HEADINGS.plan && content.includes(HEADINGS.sessions)) {
    const sessionsRegex = new RegExp(`(^|\\n)${escapeRegex(HEADINGS.sessions)}\\b`);
    return content.replace(sessionsRegex, `\n${section}\n\n${HEADINGS.sessions}`);
  }

  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n\n${section}\n` : `${section}\n`;
}

export function parseSessionMap(content: string): Map<string, string> {
  return parseSectionMap(content, HEADINGS.sessions);
}

export function updateSessionsSection(
  content: string,
  sessionMap: Map<string, string>
): string {
  return updateSection(content, sessionMap, HEADINGS.sessions);
}

export function parsePlannedMap(content: string): Map<string, string> {
  return parseSectionMap(content, HEADINGS.plan);
}

export function updatePlanSection(
  content: string,
  sessionMap: Map<string, string>
): string {
  return updateSection(content, sessionMap, HEADINGS.plan);
}

export function getSectionHeading(section: SessionSectionKey): string {
  return HEADINGS[section];
}
