import { buildTicketStats } from "@/core/tickets/buildTicketStats";

buildTicketStats().catch((error) => {
  console.error(error);
  process.exit(1);
});
