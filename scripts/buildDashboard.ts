import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PATHS } from "@/config";
import type { SprintSummary } from "@/types";

async function readSprintSummary(): Promise<SprintSummary> {
  const raw = await readFile(PATHS.sprintSummaryFile, "utf8");
  return JSON.parse(raw);
}

function renderStatusTable(statusMap: Record<string, number>) {
  const rows = Object.entries(statusMap)
    .map(([status, count]) => `| ${status} | ${count} |`)
    .join("\n");

  return `
| Status | Tickets |
|-------|--------|
${rows}
`;
}

function renderAreaTable(areaMap: Record<string, number>) {
  const rows = Object.entries(areaMap)
    .map(([area, effort]) => `| ${area} | ${effort} |`)
    .join("\n");

  return `
| Area | Effort |
|------|--------|
${rows}
`;
}

function renderDashboard(summary: SprintSummary) {
  return `## Sprint
**${summary.sprintName}**

${summary.start} → ${summary.end}

---

## Capacity

| Metric | Value |
|------|------|
| Capacity | ${summary.capacity ?? "N/A"} |
| Estimate | ${summary.totalEstimate} |
| Spent | ${summary.totalSpent} |
| Remaining | ${summary.totalRemaining} |

---

## Tickets

Total tickets: **${summary.ticketCount}**

---

## Tickets by Status

${renderStatusTable(summary.ticketsByStatus)}

---

## Effort by Area

${renderAreaTable(summary.effortByArea)}

---

## Burndown

![[burndown.svg]]

---

## Burndown Excalidraw

![[burndown.excalidraw.md]]

---
`;
}

async function main() {
  const summary = await readSprintSummary();

  const markdown = renderDashboard(summary);

  await mkdir(PATHS.dashboardDir, { recursive: true });

  await writeFile(PATHS.dashboardFile, markdown, "utf8");

  console.log(`Dashboard generated → ${PATHS.dashboardFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
