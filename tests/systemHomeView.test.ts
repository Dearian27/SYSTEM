import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemHomeView, type SystemHomeViewHost } from "@/ui/systemHomeView";
import type { HabitDashboard } from "@/types/habit";
import { noticeMessages, resetObsidianMock } from "./mocks/obsidian";

function createDashboard(): HabitDashboard {
  return {
    rangeStart: "2026-04-13",
    rangeEnd: "2026-04-19",
    habits: [
      {
        habit: {
          id: "brush-teeth",
          name: "Brush Teeth",
          requiredCompletion: 0.8,
          schedule: { type: "daily" },
          completions: {
            "2026-04-13": true,
          },
          createdAt: "2026-04-13T00:00:00.000Z",
        },
        scheduledDates: [
          "2026-04-13",
          "2026-04-14",
          "2026-04-15",
          "2026-04-16",
          "2026-04-17",
          "2026-04-18",
          "2026-04-19",
        ],
        completedDates: ["2026-04-13"],
        missedDates: [
          "2026-04-14",
          "2026-04-15",
          "2026-04-16",
          "2026-04-17",
          "2026-04-18",
          "2026-04-19",
        ],
        requiredCount: 6,
        allowedMisses: 1,
        completionRate: 1 / 7,
        isPassing: false,
      },
    ],
  };
}

function createHost(overrides: Partial<SystemHomeViewHost> = {}) {
  const host: SystemHomeViewHost = {
    loadHabitDashboard: vi.fn(async () => createDashboard()),
    createHabit: vi.fn(async () => {}),
    toggleHabitCompletion: vi.fn(async () => {}),
    ...overrides,
  };

  return host;
}

function createView(host = createHost()) {
  const contentEl = document.createElement("div");
  const view = new SystemHomeView({ contentEl } as never, host);

  return { contentEl, host, view };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("SystemHomeView", () => {
  beforeEach(() => {
    resetObsidianMock();
  });

  it("renders habit progress and toggles a scheduled day", async () => {
    const { contentEl, host, view } = createView();

    await view.onOpen();

    expect(contentEl.textContent).toContain("Build the day you actually want.");
    expect(contentEl.textContent).toContain("Brush Teeth");
    expect(contentEl.textContent).toContain("6/7 required");

    const dayButton = contentEl.querySelector<HTMLButtonElement>(
      "button[title='2026-04-14']"
    );
    expect(dayButton).toBeTruthy();
    expect(dayButton!.textContent).toContain("Tue");
    expect(contentEl.querySelectorAll(".system-heatmap-cell")).toHaveLength(70);

    dayButton!.click();
    await flushPromises();

    expect(host.toggleHabitCompletion).toHaveBeenCalledWith(
      "brush-teeth",
      "2026-04-14"
    );
  });

  it("creates a daily habit with required completion percentage", async () => {
    const { contentEl, host, view } = createView(
      createHost({
        loadHabitDashboard: vi.fn(async () => ({
          rangeStart: "2026-04-13",
          rangeEnd: "2026-04-19",
          habits: [],
        })),
      })
    );

    await view.onOpen();

    const nameInput =
      contentEl.querySelector<HTMLInputElement>("input[type='text']");
    const percentInput = contentEl.querySelector<HTMLInputElement>(
      "input[type='number']"
    );
    const form = contentEl.querySelector("form");
    expect(nameInput).toBeTruthy();
    expect(percentInput).toBeTruthy();
    expect(form).toBeTruthy();

    nameInput!.value = "75 Hard Water";
    percentInput!.value = "100";
    form!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true })
    );
    await flushPromises();

    expect(host.createHabit).toHaveBeenCalledWith({
      name: "75 Hard Water",
      requiredCompletion: 1,
      schedule: { type: "daily" },
    });
    expect(noticeMessages).toContain("Created habit: 75 Hard Water");
  });
});
