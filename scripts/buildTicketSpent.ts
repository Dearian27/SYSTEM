import { buildTicketSpent } from "@/core/tickets/buildTicketSpent";

buildTicketSpent().catch((error) => {
  console.error(error);
  process.exit(1);
});
