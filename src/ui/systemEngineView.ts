import { getClearButtonText, getHintText } from "@/constants/engine-view";
import { ViewMode } from "@/types/daily";
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
  runLightRefresh(): Promise<void>;
  runSync(): Promise<void>;
  getTicketNames(): Promise<string[]>;
  loadPlanForDate(date: string): Promise<Map<string, string>>;
  loadSessionsForDate(date: string): Promise<Map<string, string>>;
  savePlan(date: string, time: string, ticketName: string): Promise<void>;
  saveSession(date: string, time: string, ticketName: string): Promise<void>;
  clearPlan(date: string, time: string): Promise<void>;
  clearSession(date: string, time: string): Promise<void>;
};

export class SystemEngineView extends ItemView {
  private readonly plugin: SystemEngineViewHost;
  private selectedDate = todayDateString();
  private currentMode: ViewMode = ViewMode.ACTUAL;

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
    contentEl.createEl("h3", { text: "Daily Planning" });

    const dateRow = contentEl.createDiv();
    dateRow.style.display = "flex";
    dateRow.style.gap = "8px";
    dateRow.style.alignItems = "center";
    const dateInput = dateRow.createEl("input", { type: "date" });
    dateInput.value = this.selectedDate;
    dateInput.addEventListener("change", async () => {
      this.selectedDate = dateInput.value || todayDateString();
      await this.render();
    });

    const modeSelect = dateRow.createEl("select");
    for (const mode of Object.values(ViewMode)) {
      const option = modeSelect.createEl("option", {
        text: capitalize(mode),
        value: mode,
      });
      option.selected = mode === this.currentMode;
    }
    modeSelect.addEventListener("change", async () => {
      this.currentMode = (modeSelect.value as ViewMode) || "actual";
      await this.render();
    });

    const hintEl = contentEl.createEl("p");
    hintEl.style.opacity = "0.75";
    hintEl.style.marginTop = "8px";
    const hintContent = getHintText(this.currentMode);
    hintEl.setText(hintContent);

    const plan = await this.plugin.loadPlanForDate(this.selectedDate);
    const sessions = await this.plugin.loadSessionsForDate(this.selectedDate);
    const slotsEl = contentEl.createDiv();
    slotsEl.style.display = "grid";
    slotsEl.style.gap = "6px";

    for (const time of buildTimeSlots()) {
      const row = slotsEl.createDiv();
      row.style.display = "grid";
      row.style.gridTemplateColumns =
        this.currentMode === ViewMode.COMPARE
          ? "56px 1fr 1fr auto"
          : "56px 1fr auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.padding = "4px 0";

      row.createEl("code", { text: time });

      const plannedTicket = plan.get(time) ?? "";
      const actualTicket = sessions.get(time) ?? "";

      if (this.currentMode === ViewMode.COMPARE) {
        renderSlotButton({
          row,
          label: plannedTicket || "Plan slot",
          filled: Boolean(plannedTicket),
          muted: !plannedTicket,
          borderColor:
            actualTicket && plannedTicket === actualTicket
              ? "#2f9e44"
              : "#d0d7de",
          onClick: async () => {
            await this.handleSlotEdit(ViewMode.PLAN, time);
          },
        });

        renderSlotButton({
          row,
          label: actualTicket || "Actual slot",
          filled: Boolean(actualTicket),
          muted: !actualTicket,
          borderColor:
            plannedTicket && plannedTicket !== actualTicket
              ? "#e67700"
              : "#d0d7de",
          onClick: async () => {
            await this.handleSlotEdit(ViewMode.ACTUAL, time);
          },
        });
      } else {
        const isPlanMode = this.currentMode === "plan";
        const currentTicket = isPlanMode ? plannedTicket : actualTicket;
        renderSlotButton({
          row,
          label:
            currentTicket || (isPlanMode ? "Add planned work" : "Add session"),
          filled: Boolean(currentTicket),
          muted: !currentTicket,
          borderColor:
            plannedTicket && actualTicket && plannedTicket === actualTicket
              ? "#2f9e44"
              : "#d0d7de",
          onClick: async () => {
            await this.handleSlotEdit(
              isPlanMode ? ViewMode.PLAN : ViewMode.ACTUAL,
              time
            );
          },
        });
      }

      const clearButton = row.createEl("button", {
        text: getClearButtonText(this.currentMode),
      });

      clearButton.disabled =
        this.currentMode === "plan" ? !plannedTicket : !actualTicket;

      clearButton.addEventListener("click", async () => {
        await this.handleClear(
          this.currentMode === ViewMode.PLAN ? ViewMode.PLAN : ViewMode.ACTUAL,
          time
        );
      });
    }
  }

  private async handleSlotEdit(
    mode: ViewMode.PLAN | ViewMode.ACTUAL,
    time: string
  ): Promise<void> {
    try {
      console.info("[SYSTEM] Slot clicked", {
        mode,
        date: this.selectedDate,
        time,
      });
      const ticketNames = await this.plugin.getTicketNames();
      console.info("[SYSTEM] Ticket names loaded", {
        mode,
        count: ticketNames.length,
      });
      if (ticketNames.length === 0) {
        new Notice("No tickets found for selection.");
        return;
      }

      const chosenTicket = await openTicketPicker(this.app, ticketNames);
      console.info("[SYSTEM] Ticket picker resolved", {
        mode,
        chosenTicket,
        date: this.selectedDate,
        time,
      });
      if (!chosenTicket) {
        return;
      }

      if (mode === "plan") {
        await this.plugin.savePlan(this.selectedDate, time, chosenTicket);
        await this.render();
        new Notice(`Planned ${time} -> ${chosenTicket}`);
        return;
      }

      await this.plugin.saveSession(this.selectedDate, time, chosenTicket);
      await this.plugin.runLightRefresh();
      await this.render();
      new Notice(`Saved ${time} -> ${chosenTicket} and refreshed analytics`);
    } catch (error) {
      console.error(`Failed to save ${mode} entry`, error);
      new Notice(`Failed to save ${mode}: ${getErrorMessage(error)}`, 12000);
    }
  }

  private async handleClear(
    mode: "plan" | "actual",
    time: string
  ): Promise<void> {
    try {
      if (mode === "plan") {
        await this.plugin.clearPlan(this.selectedDate, time);
        await this.render();
        new Notice(`Cleared planned slot ${time}`);
        return;
      }

      await this.plugin.clearSession(this.selectedDate, time);
      await this.plugin.runLightRefresh();
      await this.render();
      new Notice(`Cleared ${time} and refreshed analytics`);
    } catch (error) {
      console.error(`Failed to clear ${mode} entry`, error);
      new Notice(`Failed to clear ${mode}: ${getErrorMessage(error)}`, 12000);
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderSlotButton(params: {
  row: HTMLElement;
  label: string;
  filled: boolean;
  muted: boolean;
  borderColor: string;
  onClick: () => Promise<void>;
}): void {
  const { row, label, filled, muted, borderColor, onClick } = params;
  const button = row.createEl("button", {
    text: label,
  });
  button.style.textAlign = "left";
  button.style.justifyContent = "flex-start";
  button.style.border = `1px solid ${borderColor}`;
  button.style.background = filled ? "#f8f9fa" : "#ffffff";
  button.style.opacity = muted ? "0.72" : "1";
  button.addEventListener("click", async () => {
    await onClick();
  });
}
