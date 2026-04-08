import { HEADINGS, SESSION_LINE_REGEX } from "@/config";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseSessionMap(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const escapedHeading = escapeRegex(HEADINGS.sessions);
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

export function updateSessionsSection(
  content: string,
  sessionMap: Map<string, string>
): string {
  const lines = [...sessionMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([time, ticketName]) => `\`${time}\` | [[${ticketName}]]`);
  const section = `${HEADINGS.sessions}\n${lines.join("\n")}`.trimEnd();
  const escapedHeading = escapeRegex(HEADINGS.sessions);
  const regex = new RegExp(`${escapedHeading}\\s*[\\s\\S]*?(?=\\n## |\\n# |$)`);

  if (regex.test(content)) {
    return content.replace(regex, section);
  }

  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n\n${section}\n` : `${section}\n`;
}
