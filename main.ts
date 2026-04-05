import {
  App,
  FileSystemAdapter,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type SystemEngineSettings = {
  enginePath: string;
  npmCommand: string;
  rebuildScripts: string[];
};

const DEFAULT_SETTINGS: SystemEngineSettings = {
  enginePath: "SYSTEM/.engine",
  npmCommand: "npm",
  rebuildScripts: ["build:all", "build:burndown-svg"],
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
        await this.runScripts(["sync:spent"], "Spent sync completed");
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
      rebuildScripts: normalizeScriptList(loaded?.rebuildScripts),
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
    await this.runScripts(this.settings.rebuildScripts, "Analytics rebuild completed");
  }

  private async runScripts(
    scripts: string[],
    successMessage: string
  ): Promise<void> {
    if (this.isRunning) {
      new Notice("SYSTEM Engine is already running.");
      return;
    }

    const normalizedScripts = normalizeScriptList(scripts);
    if (normalizedScripts.length === 0) {
      new Notice("No scripts configured for SYSTEM Engine.");
      return;
    }

    this.isRunning = true;
    this.updateStatusBar("SYSTEM: running...");
    new Notice(`SYSTEM Engine: running ${normalizedScripts.join(", ")}`);

    try {
      const cwd = this.getEngineAbsolutePath();

      for (const scriptName of normalizedScripts) {
        this.updateStatusBar(`SYSTEM: ${scriptName}`);
        await execFileAsync(this.settings.npmCommand, ["run", scriptName], {
          cwd,
        });
      }

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
      .setName("NPM command")
      .setDesc("Command used to run your scripts. Usually npm, pnpm, or yarn.")
      .addText((text) =>
        text
          .setPlaceholder("npm")
          .setValue(this.plugin.settings.npmCommand)
          .onChange(async (value) => {
            this.plugin.settings.npmCommand = value.trim() || DEFAULT_SETTINGS.npmCommand;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Rebuild scripts")
      .setDesc("One npm script name per line. They will run sequentially.")
      .addTextArea((text) => {
        text
          .setPlaceholder("build:all\nbuild:burndown-svg")
          .setValue(this.plugin.settings.rebuildScripts.join("\n"))
          .onChange(async (value) => {
            this.plugin.settings.rebuildScripts = normalizeScriptList(
              value.split("\n")
            );
            await this.plugin.saveSettings();
          });

        text.inputEl.rows = 4;
        text.inputEl.cols = 32;
      });

    new Setting(containerEl)
      .setName("Run rebuild now")
      .setDesc("Execute the configured analytics rebuild pipeline immediately.")
      .addButton((button) =>
        button.setButtonText("Run").onClick(async () => {
          await this.plugin.runRebuild();
        })
      );
  }
}

function normalizeScriptList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_SETTINGS.rebuildScripts];
  }

  const scripts = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return scripts.length > 0 ? scripts : [...DEFAULT_SETTINGS.rebuildScripts];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
