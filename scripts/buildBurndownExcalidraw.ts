import { buildBurndownExcalidraw } from "@/core/burndown/buildBurndownExcalidraw";

buildBurndownExcalidraw().catch((error) => {
  console.error(error);
  process.exit(1);
});
