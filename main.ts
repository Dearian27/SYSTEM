import {
  App,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  WorkspaceLeaf,
} from "obsidian";
import path from "node:path";
import { PATHS, setEngineRoot } from "@/config";
import { runFullAnalyticsPipeline, syncSpentToTickets } from "@/core/analytics";
import {
  clearSession,
  configureSessionPaths,
  getDailyDirVaultPath,
  loadSessionsForDate,
  saveSession,
} from "@/core/sessions/sessionStorage";
import {
  SystemEngineView,
  VIEW_TYPE_SYSTEM_ENGINE,
} from "@/ui/systemEngineView";
import { readTickets } from "@/utils/readTickets";

type SystemEngineSettings = {
  enginePath: string;
};

const DEFAULT_SETTINGS: SystemEngineSettings = {
  enginePath: "SYSTEM/.engine",
};

export default class SystemEnginePlugin extends Plugin {
  settings: SystemEngineSettings = DEFAULT_SETTINGS;
  private statusBarItemEl: HTMLElement | null = null;
  private isRunning = false;
  private currentStatus = "idle";

  async onload(): Promise<void> {
    await this.loadSettings();

    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar("SYSTEM: idle");

    this.registerView(
      VIEW_TYPE_SYSTEM_ENGINE,
      (leaf) => new SystemEngineView(leaf, this)
    );

    this.addCommand({
      id: "rebuild-analytics",
      name: "Rebuild analytics",
      callback: async () => {
        await this.runRebuild();
      },
    });

    this.addCommand({
      id: "sync-spent-only",
      name: "Sync spent to tickets",
      callback: async () => {
        await this.runSync();
      },
    });

    this.addCommand({
      id: "open-system-panel",
      name: "Open SYSTEM panel",
      callback: async () => {
        await this.activateView();
      },
    });

    this.addRibbonIcon("gantt-chart", "Open SYSTEM panel", async () => {
      await this.activateView();
    });

    this.addSettingTab(new SystemEngineSettingTab(this.app, this));
  }

  onunload(): void {
    this.updateStatusBar("SYSTEM: unloaded");
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData();
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...loaded,
    };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private getEngineAbsolutePath(): string {
    const adapter = this.app.vault.adapter;
    if (!("getBasePath" in adapter) || typeof adapter.getBasePath !== "function") {
      throw new Error("SYSTEM Engine requires the desktop file system adapter.");
    }

    return path.resolve(adapter.getBasePath(), this.settings.enginePath);
  }

  private configurePaths(): void {
    const engineRoot = this.getEngineAbsolutePath();
    setEngineRoot(engineRoot);
    configureSessionPaths(engineRoot);
  }

  private updateStatusBar(text: string): void {
    this.currentStatus = text.replace(/^SYSTEM:\s*/, "");
    this.statusBarItemEl?.setText(text);
  }

  getStatusText(): string {
    return this.currentStatus;
  }

  getDailyDirVaultPath(): string {
    this.configurePaths();
    return getDailyDirVaultPath(this.app);
  }

  async getTicketNames(): Promise<string[]> {
    this.configurePaths();
    const tickets = await readTickets();
    return tickets.map((ticket) => ticket.ticketName).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  async loadSessionsForDate(date: string): Promise<Map<string, string>> {
    this.configurePaths();
    return await loadSessionsForDate(this.app, date);
  }

  async saveSession(date: string, time: string, ticketName: string): Promise<void> {
    this.configurePaths();
    await saveSession(this.app, date, time, ticketName);
  }

  async clearSession(date: string, time: string): Promise<void> {
    this.configurePaths();
    await clearSession(this.app, date, time);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null =
      workspace.getLeavesOfType(VIEW_TYPE_SYSTEM_ENGINE)[0] ?? null;

    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (!rightLeaf) {
        return;
      }

      leaf = rightLeaf;
      await leaf.setViewState({
        type: VIEW_TYPE_SYSTEM_ENGINE,
        active: true,
      });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async runRebuild(): Promise<void> {
    await this.runTask("Analytics rebuild completed", async () => {
      this.configurePaths();
      await runFullAnalyticsPipeline();
    });
  }

  async runSync(): Promise<void> {
    await this.runTask("Spent sync completed", async () => {
      this.configurePaths();
      await syncSpentToTickets();
    });
  }

  private async runTask(
    successMessage: string,
    task: () => Promise<void>
  ): Promise<void> {
    if (this.isRunning) {
      new Notice("SYSTEM Engine is already running.");
      return;
    }

    this.isRunning = true;
    this.updateStatusBar("SYSTEM: running...");
    new Notice("SYSTEM Engine: running...");

    try {
      await task();
      this.updateStatusBar("SYSTEM: idle");
      new Notice(successMessage);
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("SYSTEM Engine rebuild failed", error);
      this.updateStatusBar("SYSTEM: failed");
      new Notice(`SYSTEM Engine failed: ${message}`, 12000);
    } finally {
      this.isRunning = false;
    }
  }
}

class SystemEngineSettingTab extends PluginSettingTab {
  plugin: SystemEnginePlugin;

  constructor(app: App, plugin: SystemEnginePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "SYSTEM Engine" });

    new Setting(containerEl)
      .setName("Engine path")
      .setDesc("Vault-relative path to the engine folder that contains package.json.")
      .addText((text) =>
        text
          .setPlaceholder("SYSTEM/.engine")
          .setValue(this.plugin.settings.enginePath)
          .onChange(async (value) => {
            this.plugin.settings.enginePath = value.trim() || DEFAULT_SETTINGS.enginePath;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Run rebuild now")
      .setDesc("Execute the configured analytics rebuild pipeline immediately.")
      .addButton((button) =>
        button.setButtonText("Run").onClick(async () => {
          await this.plugin.runRebuild();
        })
      );

    new Setting(containerEl)
      .setName("Sync spent now")
      .setDesc("Write the latest spent values back into ticket frontmatter.")
      .addButton((button) =>
        button.setButtonText("Run").onClick(async () => {
          await this.plugin.runSync();
        })
      );
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
