import { buildBurndown } from "@/core/burndown/buildBurndown";

buildBurndown().catch((error) => {
  console.error(error);
  process.exit(1);
});
