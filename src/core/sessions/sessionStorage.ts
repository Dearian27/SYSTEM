import { App, FileSystemAdapter, TFile, normalizePath } from "obsidian";
import path from "node:path";
import { HEADINGS, PATHS, setEngineRoot } from "@/config";
import { parseSessionMap, updateSessionsSection } from "@/core/sessions/sessionNote";

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
  const file = await getOrCreateDailyFile(app, date);
  const content = await app.vault.read(file);
  return parseSessionMap(content);
}

export async function saveSession(
  app: App,
  date: string,
  time: string,
  ticketName: string
): Promise<void> {
  const file = await getOrCreateDailyFile(app, date);
  const content = await app.vault.read(file);
  const sessionMap = parseSessionMap(content);
  sessionMap.set(time, ticketName);
  const updated = updateSessionsSection(content, sessionMap);
  await app.vault.modify(file, updated);
}

export async function clearSession(
  app: App,
  date: string,
  time: string
): Promise<void> {
  const file = await findDailyFile(app, date);
  if (!file) {
    return;
  }

  const content = await app.vault.read(file);
  const sessionMap = parseSessionMap(content);
  sessionMap.delete(time);
  const updated = updateSessionsSection(content, sessionMap);
  await app.vault.modify(file, updated);
}

async function getOrCreateDailyFile(app: App, date: string): Promise<TFile> {
  const existing = await findDailyFile(app, date);
  if (existing) {
    return existing;
  }

  const dailyDir = getDailyDirVaultPath(app);
  const filePath = normalizePath(`${dailyDir}/${date}.md`);
  const initialContent = `${HEADINGS.sessions}\n`;
  return await app.vault.create(filePath, initialContent);
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
