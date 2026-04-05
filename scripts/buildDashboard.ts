import { buildDashboard } from "@/core/dashboard/buildDashboard";

buildDashboard().catch((error) => {
  console.error(error);
  process.exit(1);
});
