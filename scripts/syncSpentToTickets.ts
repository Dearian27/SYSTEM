import { syncSpentToTickets } from "@/core/tickets/syncSpentToTickets";

syncSpentToTickets().catch((error) => {
  console.error(error);
  process.exit(1);
});
