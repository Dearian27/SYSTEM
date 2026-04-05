import {
  App,
  FileSystemAdapter,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import path from "node:path";
import { setEngineRoot } from "@/config";
import { runFullAnalyticsPipeline, syncSpentToTickets } from "@/core/analytics";

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

  async onload(): Promise<void> {
    await this.loadSettings();

    this.statusBarItemEl = this.addStatusBarItem();
    this.updateStatusBar("SYSTEM: idle");

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

  private getVaultBasePath(): string {
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
      throw new Error("SYSTEM Engine requires the desktop file system adapter.");
    }

    return adapter.getBasePath();
  }

  private getEngineAbsolutePath(): string {
    const basePath = this.getVaultBasePath();
    return path.resolve(basePath, this.settings.enginePath);
  }

  private updateStatusBar(text: string): void {
    this.statusBarItemEl?.setText(text);
  }

  async runRebuild(): Promise<void> {
    await this.runTask("Analytics rebuild completed", async () => {
      setEngineRoot(this.getEngineAbsolutePath());
      await runFullAnalyticsPipeline();
    });
  }

  async runSync(): Promise<void> {
    await this.runTask("Spent sync completed", async () => {
      setEngineRoot(this.getEngineAbsolutePath());
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
