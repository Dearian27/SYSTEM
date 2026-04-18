import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  chooseLatestSuggestion,
  noticeMessages,
  resetObsidianMock,
} from "./mocks/obsidian";
import { SystemEngineView, type SystemEngineViewHost } from "@/ui/systemEngineView";

function createHost(overrides: Partial<SystemEngineViewHost> = {}) {
  const host: SystemEngineViewHost = {
    app: {} as never,
    settings: {
      enginePath: "SYSTEM/.engine",
    },
    getStatusText: vi.fn(() => "idle"),
    runRebuild: vi.fn(async () => {}),
    runLightRefresh: vi.fn(async () => {}),
    runSync: vi.fn(async () => {}),
    openHome: vi.fn(async () => {}),
    getTicketNames: vi.fn(async () => ["Organizing Obsidian", "Workout"]),
    loadPlanForDate: vi.fn(async () => new Map()),
    loadSessionsForDate: vi.fn(async () => new Map()),
    savePlan: vi.fn(async () => {}),
    saveSession: vi.fn(async () => {}),
    clearPlan: vi.fn(async () => {}),
    clearSession: vi.fn(async () => {}),
    ...overrides,
  };

  return host;
}

function createView(host = createHost()) {
  const contentEl = document.createElement("div");
  const view = new SystemEngineView({ app: host.app, contentEl } as never, host);

  return { contentEl, host, view };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("SystemEngineView", () => {
  beforeEach(() => {
    resetObsidianMock();
    vi.useRealTimers();
  });

  it("saves plan entries from plan mode without refreshing analytics", async () => {
    const { contentEl, host, view } = createView();
    await view.onOpen();

    const modeSelect = contentEl.querySelector("select");
    expect(modeSelect).not.toBeNull();
    modeSelect!.value = "plan";
    modeSelect!.dispatchEvent(new Event("change"));
    await flushPromises();

    const planButton = await vi.waitFor(() => {
      const button = Array.from(contentEl.querySelectorAll("button")).find(
        (item) => item.textContent === "Add planned work"
      );
      expect(button).toBeTruthy();
      return button;
    });
    expect(planButton).toBeTruthy();

    planButton!.click();
    await flushPromises();
    chooseLatestSuggestion("Organizing Obsidian");
    await flushPromises();

    await vi.waitFor(() => {
      expect(host.savePlan).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        "07:00",
        "Organizing Obsidian"
      );
    });
    expect(host.saveSession).not.toHaveBeenCalled();
    expect(host.runLightRefresh).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(noticeMessages).toContain("Planned 07:00 -> Organizing Obsidian");
    });
  });

  it("saves actual sessions and refreshes analytics", async () => {
    const { contentEl, host, view } = createView();
    await view.onOpen();

    const actualButton = Array.from(contentEl.querySelectorAll("button")).find(
      (button) => button.textContent === "Add session"
    );
    expect(actualButton).toBeTruthy();

    actualButton!.click();
    await flushPromises();
    chooseLatestSuggestion("Workout");
    await flushPromises();

    await vi.waitFor(() => {
      expect(host.saveSession).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        "07:00",
        "Workout"
      );
      expect(host.runLightRefresh).toHaveBeenCalledTimes(1);
    });
    expect(host.savePlan).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(noticeMessages).toContain(
        "Saved 07:00 -> Workout and refreshed analytics"
      );
    });
  });

  it("opens the home view from the sidebar", async () => {
    const { contentEl, host, view } = createView();
    await view.onOpen();

    const homeButton = Array.from(contentEl.querySelectorAll("button")).find(
      (button) => button.textContent === "Open Home"
    );
    expect(homeButton).toBeTruthy();

    homeButton!.click();
    await flushPromises();

    expect(host.openHome).toHaveBeenCalledTimes(1);
  });
});
