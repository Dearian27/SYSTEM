import { App, FileSystemAdapter, TFile, normalizePath } from "obsidian";
import path from "node:path";
import { HEADINGS, PATHS, setEngineRoot } from "@/config";
import {
  parsePlannedMap,
  parseSessionMap,
  updatePlanSection,
  updateSessionsSection,
} from "@/core/sessions/sessionNote";

export type SessionSection = "plan" | "sessions";

const writeQueues = new Map<string, Promise<void>>();

function getVaultBasePath(app: App): string {
  const adapter = app.vault.adapter;
  if (!(adapter instanceof FileSystemAdapter)) {
    throw new Error("SYSTEM Engine requires the desktop file system adapter.");
  }

  return adapter.getBasePath();
}

function toVaultRelativePath(app: App, absolutePath: string): string {
  const basePath = getVaultBasePath(app);
  return normalizePath(path.relative(basePath, absolutePath));
}

export function configureSessionPaths(engineRoot: string): void {
  setEngineRoot(engineRoot);
}

export function getDailyDirVaultPath(app: App): string {
  return toVaultRelativePath(app, PATHS.dailyDir);
}

export async function loadSessionsForDate(
  app: App,
  date: string
): Promise<Map<string, string>> {
  return await loadSectionForDate(app, date, "sessions");
}

export async function loadPlanForDate(
  app: App,
  date: string
): Promise<Map<string, string>> {
  return await loadSectionForDate(app, date, "plan");
}

export async function loadSectionForDate(
  app: App,
  date: string,
  section: SessionSection
): Promise<Map<string, string>> {
  const file = await findDailyFile(app, date);
  if (!file) {
    return new Map();
  }

  const content = await app.vault.read(file);
  return section === "plan" ? parsePlannedMap(content) : parseSessionMap(content);
}

export async function saveSession(
  app: App,
  date: string,
  time: string,
  ticketName: string
): Promise<void> {
  await saveSection(app, date, time, ticketName, "sessions");
}

export async function savePlan(
  app: App,
  date: string,
  time: string,
  ticketName: string
): Promise<void> {
  await saveSection(app, date, time, ticketName, "plan");
}

export async function saveSection(
  app: App,
  date: string,
  time: string,
  ticketName: string,
  section: SessionSection
): Promise<void> {
  await queueDailyWrite(app, date, async () => {
    const file = await getOrCreateDailyFile(app, date);
    const content = await app.vault.read(file);
    const sessionMap =
      section === "plan" ? parsePlannedMap(content) : parseSessionMap(content);
    sessionMap.set(time, ticketName);
    const updated =
      section === "plan"
        ? updatePlanSection(content, sessionMap)
        : updateSessionsSection(content, sessionMap);
    await app.vault.modify(file, updated);
  });
}

export async function clearSession(
  app: App,
  date: string,
  time: string
): Promise<void> {
  await clearSection(app, date, time, "sessions");
}

export async function clearPlan(
  app: App,
  date: string,
  time: string
): Promise<void> {
  await clearSection(app, date, time, "plan");
}

export async function clearSection(
  app: App,
  date: string,
  time: string,
  section: SessionSection
): Promise<void> {
  await queueDailyWrite(app, date, async () => {
    const file = await findDailyFile(app, date);
    if (!file) {
      return;
    }

    const content = await app.vault.read(file);
    const sessionMap =
      section === "plan" ? parsePlannedMap(content) : parseSessionMap(content);
    sessionMap.delete(time);
    const updated =
      section === "plan"
        ? updatePlanSection(content, sessionMap)
        : updateSessionsSection(content, sessionMap);
    await app.vault.modify(file, updated);
  });
}

async function getOrCreateDailyFile(app: App, date: string): Promise<TFile> {
  const existing = await findDailyFile(app, date);
  if (existing) {
    return existing;
  }

  const filePath = getDailyFileVaultPath(app, date);
  const initialContent = `${HEADINGS.plan}\n\n${HEADINGS.sessions}\n`;
  return await app.vault.create(filePath, initialContent);
}

function getDailyFileVaultPath(app: App, date: string): string {
  const dailyDir = getDailyDirVaultPath(app);
  return normalizePath(`${dailyDir}/${date}.md`);
}

async function queueDailyWrite(
  app: App,
  date: string,
  write: () => Promise<void>
): Promise<void> {
  const filePath = getDailyFileVaultPath(app, date);
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const next = previous.then(write, write);
  writeQueues.set(filePath, next);

  try {
    await next;
  } finally {
    if (writeQueues.get(filePath) === next) {
      writeQueues.delete(filePath);
    }
  }
}

async function findDailyFile(app: App, date: string): Promise<TFile | null> {
  const dailyDir = getDailyDirVaultPath(app);

  return (
    app.vault
      .getFiles()
      .find(
        (file) =>
          file.path.startsWith(`${dailyDir}/`) &&
          file.extension === "md" &&
          file.basename.includes(date)
      ) ?? null
  );
}
