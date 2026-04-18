import type {
  Habit,
  HabitDashboard,
  HabitProgress,
  HabitSchedule,
} from "@/types/habit";
import { ItemView, Notice, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_SYSTEM_HOME = "system-home-view";

export type SystemHomeViewHost = {
  loadHabitDashboard(): Promise<HabitDashboard>;
  createHabit(input: {
    name: string;
    description?: string;
    requiredCompletion: number;
    schedule: HabitSchedule;
  }): Promise<void>;
  toggleHabitCompletion(habitId: string, date: string): Promise<void>;
};

export class SystemHomeView extends ItemView {
  private readonly plugin: SystemHomeViewHost;

  constructor(leaf: WorkspaceLeaf, plugin: SystemHomeViewHost) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_SYSTEM_HOME;
  }

  getDisplayText(): string {
    return "SYSTEM Home";
  }

  getIcon(): string {
    return "layout-dashboard";
  }

  async onOpen(): Promise<void> {
    await this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  private async render(): Promise<void> {
    const dashboard = await this.plugin.loadHabitDashboard();
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("system-home-view");
    injectHomeStyles(contentEl);

    const shell = contentEl.createDiv();
    shell.addClass("system-home-shell");

    const hero = shell.createDiv();
    hero.addClass("system-home-hero");
    hero.createEl("p", { text: "SYSTEM Home" }).addClass("system-home-kicker");
    hero.createEl("h1", { text: "Build the day you actually want." });
    hero
      .createEl("p", {
        text: "Track habits, forgiving schedules, and challenge progress from one calm cockpit.",
      })
      .addClass("system-home-subtitle");

    const summary = hero.createDiv();
    summary.addClass("system-home-summary");
    renderSummaryPill(
      summary,
      "Window",
      `${dashboard.rangeStart} -> ${dashboard.rangeEnd}`
    );
    renderSummaryPill(summary, "Habits", String(dashboard.habits.length));
    renderSummaryPill(
      summary,
      "Passing",
      String(countPassing(dashboard.habits))
    );

    renderCreateHabitCard(shell, async (input) => {
      await this.plugin.createHabit(input);
      new Notice(`Created habit: ${input.name}`);
      await this.render();
    });

    const list = shell.createDiv();
    list.addClass("system-home-grid");

    if (dashboard.habits.length === 0) {
      const empty = list.createDiv();
      empty.addClass("system-home-empty");
      empty.createEl("h2", { text: "No habits yet" });
      empty.createEl("p", {
        text: "Create your first tracker above. Try 75 Hard with 100%, or a flexible habit with 80%.",
      });
      return;
    }

    for (const progress of dashboard.habits) {
      renderHabitCard(
        list,
        progress,
        dashboard.rangeEnd,
        async (date) => {
          await this.plugin.toggleHabitCompletion(progress.habit.id, date);
          await this.render();
        }
      );
    }
  }
}

function renderCreateHabitCard(
  parent: HTMLElement,
  onCreate: (input: {
    name: string;
    description?: string;
    requiredCompletion: number;
    schedule: HabitSchedule;
  }) => Promise<void>
): void {
  const card = parent.createDiv();
  card.addClass("system-home-create");
  card.createEl("h2", { text: "New habit" });

  const form = card.createEl("form");
  form.addClass("system-home-form");

  const nameField = form.createEl("label");
  nameField.addClass("system-home-field");
  nameField.createEl("span", { text: "Habit" });
  const nameInput = nameField.createEl("input", {
    type: "text",
  });
  nameInput.placeholder = "Habit name, e.g. read 15 pages";

  const targetField = form.createEl("label");
  targetField.addClass("system-home-field");
  targetField.addClass("system-home-target-field");
  targetField.createEl("span", { text: "Required %" });
  const targetWrap = targetField.createDiv();
  targetWrap.addClass("system-home-percent");
  const targetInput = targetWrap.createEl("input", {
    type: "number",
    value: "100",
  });
  targetInput.min = "1";
  targetInput.max = "100";
  targetInput.step = "1";
  targetInput.title = "Required completion percentage";
  targetWrap.createEl("span", { text: "%" });

  const scheduleField = form.createEl("label");
  scheduleField.addClass("system-home-field");
  scheduleField.addClass("system-home-schedule-field");
  scheduleField.createEl("span", { text: "Frequency" });
  const scheduleSelect = scheduleField.createEl("select");
  addOption(scheduleSelect, "daily", "Every day");
  addOption(scheduleSelect, "weekdays", "Weekdays");
  addOption(scheduleSelect, "weekends", "Weekends");

  const submit = form.createEl("button", { text: "Create" });
  submit.type = "submit";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();

    if (!name) {
      new Notice("Habit name is required.");
      return;
    }

    await onCreate({
      name,
      requiredCompletion: Number(targetInput.value) / 100,
      schedule: parseSchedule(scheduleSelect.value),
    });

    form.reset();
    targetInput.value = "100";
  });
}

function renderHabitCard(
  parent: HTMLElement,
  progress: HabitProgress,
  rangeEnd: string,
  onToggle: (date: string) => Promise<void>
): void {
  const card = parent.createDiv();
  card.addClass("system-habit-card");
  if (progress.isPassing) {
    card.addClass("is-passing");
  }

  const top = card.createDiv();
  top.addClass("system-habit-top");
  const title = top.createDiv();
  title.createEl("h2", { text: progress.habit.name });
  title.createEl("p", { text: describeRequirement(progress) });

  const score = top.createDiv();
  score.addClass("system-habit-score");
  score.setText(`${Math.round(progress.completionRate * 100)}%`);

  const bar = card.createDiv();
  bar.addClass("system-habit-bar");
  const fill = bar.createDiv();
  fill.style.width = `${Math.round(progress.completionRate * 100)}%`;

  const dates = card.createDiv();
  dates.addClass("system-habit-dates");

  for (const date of progress.scheduledDates) {
    const done = progress.habit.completions[date] === true;
    const button = dates.createEl("button");
    button.addClass(done ? "is-done" : "is-open");
    button.title = date;
    button.createEl("strong", { text: weekdayLabel(date) });
    button.createEl("span", { text: shortDateLabel(date) });
    button.addEventListener("click", async () => {
      await onToggle(date);
    });
  }

  renderHeatmap(card, progress.habit, rangeEnd, onToggle);
}

function renderSummaryPill(
  parent: HTMLElement,
  label: string,
  value: string
): void {
  const pill = parent.createDiv();
  pill.addClass("system-home-pill");
  pill.createEl("span", { text: label });
  pill.createEl("strong", { text: value });
}

function describeRequirement(progress: HabitProgress): string {
  if (progress.allowedMisses === 0) {
    return `${progress.requiredCount}/${progress.scheduledDates.length} required. No misses allowed.`;
  }

  return `${progress.requiredCount}/${progress.scheduledDates.length} required. ${progress.allowedMisses} planned miss(es) available.`;
}

function parseSchedule(value: string): HabitSchedule {
  if (value === "weekdays") {
    return { type: "weekly", weekdays: [1, 2, 3, 4, 5] };
  }

  if (value === "weekends") {
    return { type: "weekly", weekdays: [6, 7] };
  }

  return { type: "daily" };
}

function addOption(
  select: HTMLSelectElement,
  value: string,
  text: string
): void {
  const option = select.createEl("option", { text, value });
  option.value = value;
}

function countPassing(habits: HabitProgress[]): number {
  return habits.filter((habit) => habit.isPassing).length;
}

function shortDateLabel(date: string): string {
  return date.slice(5);
}

function weekdayLabel(date: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00.000Z`));
}

function renderHeatmap(
  parent: HTMLElement,
  habit: Habit,
  rangeEnd: string,
  onToggle: (date: string) => Promise<void>
): void {
  const section = parent.createDiv();
  section.addClass("system-habit-heatmap-section");
  section.createEl("p", { text: "Mini calendar" }).addClass("system-habit-mini-title");

  const heatmap = section.createDiv();
  heatmap.addClass("system-habit-heatmap");

  const weekdayColumn = heatmap.createDiv();
  weekdayColumn.addClass("system-habit-weekdays");
  for (const label of ["M", "T", "W", "T", "F", "S", "S"]) {
    weekdayColumn.createEl("span", { text: label });
  }

  const grid = heatmap.createDiv();
  grid.addClass("system-habit-heatmap-grid");

  for (const day of buildHeatmapDays(habit, rangeEnd, 10)) {
    const cell = grid.createEl("button");
    cell.addClass("system-heatmap-cell");
    cell.addClass(`is-${day.state}`);
    cell.title = `${day.date} - ${day.state}`;
    cell.disabled = day.state === "before-start" || day.state === "off";
    cell.addEventListener("click", async () => {
      await onToggle(day.date);
    });
  }
}

type HeatmapDay = {
  date: string;
  state: "done" | "missed" | "off" | "before-start";
};

function buildHeatmapDays(
  habit: Habit,
  rangeEnd: string,
  weeks: number
): HeatmapDay[] {
  const end = parseDate(rangeEnd);
  const start = addDays(startOfIsoWeek(rangeEnd), -7 * (weeks - 1));
  const habitStart = toDateString(new Date(habit.createdAt));
  const days: HeatmapDay[] = [];

  for (let index = 0; index < weeks * 7; index += 1) {
    const date = toDateString(new Date(start.getTime() + index * DAY_MS));
    const current = parseDate(date);

    if (date < habitStart) {
      days.push({ date, state: "before-start" });
    } else if (current.getTime() > end.getTime() || !isScheduledOn(habit.schedule, date)) {
      days.push({ date, state: "off" });
    } else if (habit.completions[date]) {
      days.push({ date, state: "done" });
    } else {
      days.push({ date, state: "missed" });
    }
  }

  return days;
}

function isScheduledOn(schedule: HabitSchedule, date: string): boolean {
  if (schedule.type === "daily") {
    return true;
  }

  return schedule.weekdays.includes(isoWeekday(date));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): Date {
  return new Date(parseDate(date).getTime() + days * DAY_MS);
}

function startOfIsoWeek(date: string): string {
  const parsed = parseDate(date);
  const weekday = isoWeekday(date);
  return toDateString(new Date(parsed.getTime() - (weekday - 1) * DAY_MS));
}

function isoWeekday(date: string): number {
  const day = parseDate(date).getUTCDay();
  return day === 0 ? 7 : day;
}

function injectHomeStyles(parent: HTMLElement): void {
  const style = parent.createEl("style");
  style.textContent = `
    .system-home-view {
      --home-ink: #111713;
      --home-muted: #6d7469;
      --home-paper: #f4f0e6;
      --home-card: rgba(255, 252, 243, 0.90);
      --home-line: rgba(17, 23, 19, 0.13);
      --home-green: #557d58;
      --home-green-deep: #1f3b2a;
      --home-rose: #b56383;
      --home-sun: #e3a33a;
      --home-lime: #bddb58;
      --home-charcoal: #151816;
      color: var(--home-ink);
      background:
        radial-gradient(circle at 10% 8%, rgba(181, 99, 131, 0.24), transparent 24%),
        radial-gradient(circle at 86% 4%, rgba(189, 219, 88, 0.22), transparent 26%),
        radial-gradient(circle at 84% 82%, rgba(227, 163, 58, 0.16), transparent 30%),
        linear-gradient(135deg, #f8f4ea 0%, #e8eee0 100%);
      min-height: 100%;
      padding: 18px;
    }

    .system-home-shell {
      max-width: 1040px;
      margin: 0 auto;
    }

    .system-home-hero,
    .system-home-create,
    .system-habit-card,
    .system-home-empty {
      border: 1px solid var(--home-line);
      border-radius: 24px;
      background: var(--home-card);
      box-shadow: 0 22px 70px rgba(21, 24, 22, 0.10);
      backdrop-filter: blur(12px);
    }

    .system-home-hero {
      padding: 28px;
      overflow: hidden;
      position: relative;
    }

    .system-home-hero::after {
      content: "";
      position: absolute;
      right: 32px;
      top: 32px;
      width: 78px;
      height: 78px;
      border-radius: 24px;
      background:
        linear-gradient(135deg, var(--home-lime), transparent 45%),
        linear-gradient(315deg, var(--home-rose), var(--home-charcoal));
      opacity: 0.86;
      transform: rotate(8deg);
    }

    .system-home-kicker {
      color: var(--home-green);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.16em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .system-home-hero h1 {
      color: var(--home-rose);
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(32px, 6vw, 64px);
      line-height: 0.95;
      margin: 0;
      max-width: 680px;
    }

    .system-home-subtitle {
      color: var(--home-muted);
      font-size: 16px;
      max-width: 620px;
    }

    .system-home-summary,
    .system-home-form,
    .system-habit-top,
    .system-habit-dates {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    .system-home-pill {
      border: 1px solid var(--home-line);
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.58);
    }

    .system-home-pill span {
      color: var(--home-muted);
      margin-right: 8px;
    }

    .system-home-create {
      margin-top: 16px;
      padding: 18px;
    }

    .system-home-create h2,
    .system-habit-card h2,
    .system-home-empty h2 {
      margin: 0 0 8px;
    }

    .system-home-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 140px;
    }

    .system-home-field > span {
      color: var(--home-muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .system-home-form input,
    .system-home-form select,
    .system-home-percent {
      border: 1px solid var(--home-line);
      border-radius: 14px;
      min-height: 44px;
      padding: 0 12px;
      background: rgba(255, 255, 255, 0.72);
      color: var(--home-ink);
      font-size: 15px;
      line-height: 44px;
    }

    .system-home-field:first-child {
      min-width: min(360px, 100%);
      flex: 1;
    }

    .system-home-form input {
      width: 100%;
    }

    .system-home-form select {
      min-width: 160px;
      height: 46px;
      line-height: 1.2;
      padding-right: 36px;
      white-space: nowrap;
    }

    .system-home-target-field {
      min-width: 116px;
    }

    .system-home-schedule-field {
      min-width: 170px;
    }

    .system-home-percent {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
    }

    .system-home-percent input {
      border: 0;
      min-height: auto;
      padding: 0;
      background: transparent;
      line-height: 1;
      text-align: right;
      width: 58px;
    }

    .system-home-percent span {
      color: var(--home-rose);
      font-weight: 900;
    }

    .system-home-form button,
    .system-habit-dates button {
      border: 0;
      border-radius: 14px;
      cursor: pointer;
      font-weight: 700;
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .system-home-form button {
      align-self: flex-end;
      min-height: 46px;
      background: var(--home-charcoal);
      color: #fffaf0;
      padding: 11px 16px;
    }

    .system-home-form button:hover,
    .system-habit-dates button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 24px rgba(23, 33, 26, 0.16);
    }

    .system-home-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }

    .system-habit-card,
    .system-home-empty {
      padding: 18px;
    }

    .system-habit-top {
      justify-content: space-between;
      align-items: flex-start;
    }

    .system-habit-top p {
      color: var(--home-muted);
      margin: 0;
    }

    .system-habit-score {
      border-radius: 18px;
      background: rgba(227, 163, 58, 0.18);
      color: #806018;
      font-size: 24px;
      font-weight: 900;
      padding: 10px 12px;
    }

    .system-habit-card.is-passing .system-habit-score {
      background: rgba(85, 125, 88, 0.18);
      color: var(--home-green);
    }

    .system-habit-bar {
      height: 10px;
      margin: 16px 0;
      border-radius: 999px;
      background: rgba(23, 33, 26, 0.10);
      overflow: hidden;
    }

    .system-habit-bar div {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--home-rose), var(--home-sun), var(--home-green));
      transition: width 180ms ease;
    }

    .system-habit-dates button {
      display: grid;
      gap: 2px;
      min-width: 64px;
      padding: 8px 10px;
    }

    .system-habit-dates button strong {
      font-size: 13px;
      line-height: 1;
    }

    .system-habit-dates button span {
      font-size: 11px;
      opacity: 0.72;
    }

    .system-habit-dates button.is-done {
      background: var(--home-green-deep);
      color: white;
    }

    .system-habit-dates button.is-open {
      background: rgba(23, 33, 26, 0.08);
      color: var(--home-muted);
    }

    .system-habit-heatmap-section {
      margin-top: 16px;
    }

    .system-habit-mini-title {
      color: var(--home-muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }

    .system-habit-heatmap {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      border: 1px solid rgba(17, 23, 19, 0.08);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.42);
      padding: 10px;
      overflow-x: auto;
    }

    .system-habit-weekdays {
      display: grid;
      grid-template-rows: repeat(7, 14px);
      gap: 4px;
      color: var(--home-muted);
      flex: 0 0 auto;
      font-size: 9px;
      font-weight: 800;
      line-height: 14px;
      opacity: 0.74;
      text-align: center;
      width: 12px;
    }

    .system-habit-heatmap-grid {
      display: grid;
      grid-auto-flow: column;
      grid-template-rows: repeat(7, 14px);
      gap: 4px;
    }

    .system-heatmap-cell {
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      height: 14px;
      padding: 0;
      width: 14px;
    }

    .system-heatmap-cell.is-done {
      background: var(--home-green-deep);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
    }

    .system-heatmap-cell.is-missed {
      background: rgba(181, 99, 131, 0.38);
    }

    .system-heatmap-cell.is-off {
      background: rgba(17, 23, 19, 0.08);
      cursor: default;
    }

    .system-heatmap-cell.is-before-start {
      background: transparent;
      cursor: default;
      box-shadow: inset 0 0 0 1px rgba(17, 23, 19, 0.08);
    }

    .system-home-empty {
      grid-column: 1 / -1;
    }

    @media (max-width: 720px) {
      .system-home-view {
        padding: 10px;
      }

      .system-home-hero::after {
        display: none;
      }

      .system-home-form {
        align-items: stretch;
      }

      .system-home-field,
      .system-home-schedule-field,
      .system-home-target-field {
        min-width: 100%;
      }

      .system-home-form button {
        align-self: stretch;
      }

      .system-home-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
}
