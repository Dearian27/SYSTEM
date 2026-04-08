import {
  App,
  FuzzySuggestModal,
  ItemView,
  Notice,
  WorkspaceLeaf,
} from "obsidian";

export const VIEW_TYPE_SYSTEM_ENGINE = "system-engine-view";

export type SystemEngineViewHost = {
  app: App;
  settings: {
    enginePath: string;
  };
  getStatusText(): string;
  runRebuild(): Promise<void>;
  runSync(): Promise<void>;
  getTicketNames(): Promise<string[]>;
  loadSessionsForDate(date: string): Promise<Map<string, string>>;
  saveSession(date: string, time: string, ticketName: string): Promise<void>;
  clearSession(date: string, time: string): Promise<void>;
};

export class SystemEngineView extends ItemView {
  private readonly plugin: SystemEngineViewHost;
  private selectedDate = todayDateString();

  constructor(leaf: WorkspaceLeaf, plugin: SystemEngineViewHost) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_SYSTEM_ENGINE;
  }

  getDisplayText(): string {
    return "SYSTEM Engine";
  }

  getIcon(): string {
    return "gantt-chart";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  private async render(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("system-engine-view");

    contentEl.createEl("h2", { text: "SYSTEM Engine" });
    contentEl.createEl("p", {
      text: "Quick actions for analytics rebuild and ticket sync.",
    });

    const statusEl = contentEl.createEl("p");
    statusEl.setText(`Status: ${this.plugin.getStatusText()}`);

    const rebuildButton = contentEl.createEl("button", {
      text: "Rebuild analytics",
    });
    rebuildButton.addEventListener("click", async () => {
      statusEl.setText("Status: running rebuild...");
      await this.plugin.runRebuild();
      statusEl.setText(`Status: ${this.plugin.getStatusText()}`);
    });

    const syncButton = contentEl.createEl("button", {
      text: "Sync spent",
    });
    syncButton.style.marginLeft = "8px";
    syncButton.addEventListener("click", async () => {
      statusEl.setText("Status: syncing spent...");
      await this.plugin.runSync();
      statusEl.setText(`Status: ${this.plugin.getStatusText()}`);
    });

    const pathEl = contentEl.createEl("p");
    pathEl.setText(`Engine path: ${this.plugin.settings.enginePath}`);

    contentEl.createEl("hr");
    contentEl.createEl("h3", { text: "Daily Sessions" });

    const dateRow = contentEl.createDiv();
    const dateInput = dateRow.createEl("input", { type: "date" });
    dateInput.value = this.selectedDate;
    dateInput.addEventListener("change", async () => {
      this.selectedDate = dateInput.value || todayDateString();
      await this.render();
    });

    const sessions = await this.plugin.loadSessionsForDate(this.selectedDate);
    const slotsEl = contentEl.createDiv();
    slotsEl.style.display = "grid";
    slotsEl.style.gap = "6px";

    for (const time of buildTimeSlots()) {
      const row = slotsEl.createDiv();
      row.style.display = "grid";
      row.style.gridTemplateColumns = "56px 1fr auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";

      row.createEl("code", { text: time });

      const ticketName = sessions.get(time) ?? "";
      const slotButton = row.createEl("button", {
        text: ticketName || "Add session",
      });
      slotButton.addEventListener("click", async () => {
        try {
          console.info("[SYSTEM] Slot clicked", {
            date: this.selectedDate,
            time,
          });
          const ticketNames = await this.plugin.getTicketNames();
          console.info("[SYSTEM] Ticket names loaded", {
            count: ticketNames.length,
          });
          if (ticketNames.length === 0) {
            new Notice("No tickets found for selection.");
            return;
          }

          const chosenTicket = await openTicketPicker(this.app, ticketNames);
          console.info("[SYSTEM] Ticket picker resolved", {
            chosenTicket,
            date: this.selectedDate,
            time,
          });
          if (!chosenTicket) {
            return;
          }

          await this.plugin.saveSession(this.selectedDate, time, chosenTicket);
          console.info("[SYSTEM] Session saved", {
            date: this.selectedDate,
            time,
            chosenTicket,
          });
          await this.render();
          new Notice(`Saved ${time} -> ${chosenTicket}`);
        } catch (error) {
          console.error("Failed to save session", error);
          new Notice(`Failed to save session: ${getErrorMessage(error)}`, 12000);
        }
      });

      const clearButton = row.createEl("button", { text: "Clear" });
      clearButton.disabled = !ticketName;
      clearButton.addEventListener("click", async () => {
        try {
          await this.plugin.clearSession(this.selectedDate, time);
          await this.render();
        } catch (error) {
          console.error("Failed to clear session", error);
          new Notice(`Failed to clear session: ${getErrorMessage(error)}`, 12000);
        }
      });
    }
  }
}

function buildTimeSlots(): string[] {
  const slots: string[] = [];

  for (let hour = 7; hour <= 23; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 23 && minute === 30) {
        continue;
      }

      slots.push(
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      );
    }
  }

  return slots;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function openTicketPicker(
  app: App,
  tickets: string[]
): Promise<string | null> {
  console.info("[SYSTEM] Opening ticket picker", { count: tickets.length });
  return await new Promise((resolve) => {
    const modal = new TicketSuggestModal(app, tickets, resolve);
    modal.open();
  });
}

class TicketSuggestModal extends FuzzySuggestModal<string> {
  private readonly tickets: string[];
  private readonly resolveChoice: (value: string | null) => void;
  private didChoose = false;
  private didResolve = false;

  constructor(
    app: App,
    tickets: string[],
    resolveChoice: (value: string | null) => void
  ) {
    super(app);
    this.tickets = tickets;
    this.resolveChoice = resolveChoice;
    this.setPlaceholder("Select a ticket");
  }

  getItems(): string[] {
    return this.tickets;
  }

  getItemText(item: string): string {
    return item;
  }

  onChooseItem(item: string): void {
    console.info("[SYSTEM] Ticket chosen", { item });
    this.didChoose = true;
    if (!this.didResolve) {
      this.didResolve = true;
      this.resolveChoice(item);
    }
  }

  onClose(): void {
    super.onClose();
    console.info("[SYSTEM] Ticket picker closed", {
      didChoose: this.didChoose,
    });
    window.setTimeout(() => {
      if (!this.didChoose && !this.didResolve) {
        this.didResolve = true;
        this.resolveChoice(null);
      }
    }, 0);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
