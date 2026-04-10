import { ViewMode } from "@/types/daily";

export const getHintText = (viewMode: ViewMode) =>
  ({
    [ViewMode.PLAN]: "Plan mode edits ## Plan only.",
    [ViewMode.ACTUAL]: "Actual mode edits ## Sessions and refreshes analytics.",
    [ViewMode.COMPARE]: "Compare mode shows plan vs actual for each slot.",
  }[viewMode]);

export const getClearButtonText = (viewMode: ViewMode) =>
  ({
    [ViewMode.PLAN]: "Clear Plan",
    [ViewMode.COMPARE]: "Clear Actual",
    [ViewMode.ACTUAL]: "Clear",
  }[viewMode]);
