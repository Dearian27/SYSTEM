import { parseDailySessions } from "@/core/sessions/parseDailySessions";

parseDailySessions().catch((error) => {
  console.error(error);
  process.exit(1);
});
