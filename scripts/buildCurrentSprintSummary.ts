import { buildCurrentSprintSummary } from "@/core/sprints/buildCurrentSprintSummary";

buildCurrentSprintSummary().catch((error) => {
  console.error(error);
  process.exit(1);
});
