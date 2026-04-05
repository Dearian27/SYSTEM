import { buildBurndownSvg } from "@/core/burndown/buildBurndownSvg";

buildBurndownSvg().catch((error) => {
  console.error(error);
  process.exit(1);
});
