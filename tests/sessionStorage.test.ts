import { beforeEach, describe, expect, it, vi } from "vitest";

import { FileSystemAdapter } from "obsidian";
import {
  clearPlan,
  clearSession,
  configureSessionPaths,
  loadPlanForDate,
  loadSessionsForDate,
  savePlan,
  saveSession,
} from "@/core/sessions/sessionStorage";

type FakeFile = {
  path: string;
  basename: string;
  extension: string;
};

function createFakeApp(initialFiles: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initialFiles));

  const vault = {
    adapter: new FileSystemAdapter("/vault"),
    getFiles: vi.fn(() =>
      [...files.keys()].map((filePath) => toFakeFile(filePath))
    ),
    read: vi.fn(async (file: FakeFile) => files.get(file.path) ?? ""),
    create: vi.fn(async (filePath: string, content: string) => {
      files.set(filePath, content);
      return toFakeFile(filePath);
    }),
    modify: vi.fn(async (file: FakeFile, content: string) => {
      files.set(file.path, content);
    }),
  };

  const app = { vault };

  return {
    app,
    files,
    readContent: (filePath: string) => files.get(filePath),
  };
}

function toFakeFile(filePath: string): FakeFile {
  const normalized = filePath.replace(/\\/g, "/");
  const name = normalized.split("/").at(-1) ?? normalized;
  const dotIndex = name.lastIndexOf(".");

  return {
    path: normalized,
    basename: dotIndex >= 0 ? name.slice(0, dotIndex) : name,
    extension: dotIndex >= 0 ? name.slice(dotIndex + 1) : "",
  };
}

describe("sessionStorage", () => {
  beforeEach(() => {
    configureSessionPaths("/vault/SYSTEM/.engine");
  });

  it("creates a new daily note with plan before sessions when saving a plan", async () => {
    const ctx = createFakeApp();
    const filePath = "SYSTEM/Daily Reports/2026-04-10.md";

    await savePlan(ctx.app as never, "2026-04-10", "09:00", "Plan Work");

    const content = ctx.readContent(filePath);
    expect(content).toContain("## Plan\n`09:00` | [[Plan Work]]");
    expect(content).toContain("## Sessions");
    expect(content?.indexOf("## Plan")).toBeLessThan(
      content?.indexOf("## Sessions") ?? 0
    );
  });

  it("saves an actual session without deleting plan or notes", async () => {
    const filePath = "SYSTEM/Daily Reports/2026-04-10.md";
    const ctx = createFakeApp({
      [filePath]:
        "# Daily\n\n## Plan\n`09:00` | [[Plan Work]]\n\n## Sessions\n\n## Notes\nHello\n",
    });

    await saveSession(ctx.app as never, "2026-04-10", "10:00", "Actual Work");

    const content = ctx.readContent(filePath);
    expect(content).toContain("## Plan\n`09:00` | [[Plan Work]]");
    expect(content).toContain("## Sessions\n`10:00` | [[Actual Work]]");
    expect(content).toContain("## Notes\nHello");
  });

  it("inserts plan before existing sessions when saving plan into an existing note", async () => {
    const filePath = "SYSTEM/Daily Reports/2026-04-10.md";
    const ctx = createFakeApp({
      [filePath]: "# Daily\n\n## Sessions\n`10:00` | [[Actual Work]]\n\n## Notes\nHello\n",
    });

    await savePlan(ctx.app as never, "2026-04-10", "09:00", "Planned Work");

    const content = ctx.readContent(filePath);
    expect(content).toContain("## Plan\n`09:00` | [[Planned Work]]");
    expect(content).toContain("## Sessions\n`10:00` | [[Actual Work]]");
    expect(content?.indexOf("## Plan")).toBeLessThan(
      content?.indexOf("## Sessions") ?? 0
    );
    expect(content).toContain("## Notes\nHello");
  });

  it("clears only the selected plan entry and keeps sessions intact", async () => {
    const filePath = "SYSTEM/Daily Reports/2026-04-10.md";
    const ctx = createFakeApp({
      [filePath]:
        "## Plan\n`09:00` | [[Plan A]]\n`10:00` | [[Plan B]]\n\n## Sessions\n`11:00` | [[Actual A]]\n",
    });

    await clearPlan(ctx.app as never, "2026-04-10", "09:00");

    const plan = await loadPlanForDate(ctx.app as never, "2026-04-10");
    const sessions = await loadSessionsForDate(ctx.app as never, "2026-04-10");

    expect(plan).toEqual(new Map([["10:00", "Plan B"]]));
    expect(sessions).toEqual(new Map([["11:00", "Actual A"]]));
  });

  it("clears only the selected session entry and keeps plan intact", async () => {
    const filePath = "SYSTEM/Daily Reports/2026-04-10.md";
    const ctx = createFakeApp({
      [filePath]:
        "## Plan\n`09:00` | [[Plan A]]\n\n## Sessions\n`10:00` | [[Actual A]]\n`11:00` | [[Actual B]]\n",
    });

    await clearSession(ctx.app as never, "2026-04-10", "10:00");

    const plan = await loadPlanForDate(ctx.app as never, "2026-04-10");
    const sessions = await loadSessionsForDate(ctx.app as never, "2026-04-10");

    expect(plan).toEqual(new Map([["09:00", "Plan A"]]));
    expect(sessions).toEqual(new Map([["11:00", "Actual B"]]));
  });
});
