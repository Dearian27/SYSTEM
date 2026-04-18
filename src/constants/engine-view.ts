import { ViewMode } from "@/types/daily";

export const getHintText = (viewMode: ViewMode) =>
  ({
    [ViewMode.PLAN]: "Planning what you want to spend time on.",
    [ViewMode.ACTUAL]: "Logging what actually happened.",
    [ViewMode.COMPARE]: "Comparing your plan with the real day.",
  }[viewMode]);

export const getViewTitle = (viewMode: ViewMode) =>
  ({
    [ViewMode.PLAN]: "Plan",
    [ViewMode.ACTUAL]: "Actual",
    [ViewMode.COMPARE]: "Plan vs Actual",
  }[viewMode]);

export const getClearButtonText = (viewMode: ViewMode) =>
  ({
    [ViewMode.PLAN]: "Clear Plan",
    [ViewMode.COMPARE]: "Clear Actual",
    [ViewMode.ACTUAL]: "Clear",
  }[viewMode]);
