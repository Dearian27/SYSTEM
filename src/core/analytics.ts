import { buildBurndown } from "@/core/burndown/buildBurndown";
import { buildBurndownExcalidraw } from "@/core/burndown/buildBurndownExcalidraw";
import { buildBurndownSvg } from "@/core/burndown/buildBurndownSvg";
import { buildDashboard } from "@/core/dashboard/buildDashboard";
import { parseDailySessions } from "@/core/sessions/parseDailySessions";
import { buildCurrentSprintSummary } from "@/core/sprints/buildCurrentSprintSummary";
import { buildTicketSpent } from "@/core/tickets/buildTicketSpent";
import { buildTicketStats } from "@/core/tickets/buildTicketStats";
import { syncSpentToTickets } from "@/core/tickets/syncSpentToTickets";

export async function runLightAnalyticsRefresh(): Promise<void> {
  await parseDailySessions();
  await buildTicketSpent();
  await buildTicketStats();
  const sprintSummary = await buildCurrentSprintSummary();

  if (!sprintSummary) {
    return;
  }

  const burndownData = await buildBurndown();
  await buildDashboard();

  if (burndownData) {
    await buildBurndownSvg();
    await buildBurndownExcalidraw();
  }

  await syncSpentToTickets();
}

export async function runFullAnalyticsPipeline(): Promise<void> {
  await runLightAnalyticsRefresh();
}

export {
  buildBurndown,
  buildBurndownExcalidraw,
  buildBurndownSvg,
  buildCurrentSprintSummary,
  buildDashboard,
  buildTicketSpent,
  buildTicketStats,
  parseDailySessions,
  syncSpentToTickets,
};
