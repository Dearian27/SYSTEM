let latestFuzzySuggestModal: FuzzySuggestModal<unknown> | null = null;
export const noticeMessages: string[] = [];

export class FileSystemAdapter {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getBasePath(): string {
    return this.basePath;
  }
}

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

export class Notice {
  constructor(message: string) {
    noticeMessages.push(message);
  }
}

export class ItemView {
  contentEl: HTMLElement;
  app: unknown;

  constructor(leaf: { app?: unknown; contentEl?: HTMLElement }) {
    this.app = leaf.app;
    this.contentEl = leaf.contentEl ?? document.createElement("div");
  }
}

export class FuzzySuggestModal<T> {
  app: unknown;
  private placeholder = "";

  constructor(app: unknown) {
    this.app = app;
  }

  setPlaceholder(value: string): void {
    this.placeholder = value;
  }

  open(): void {
    latestFuzzySuggestModal = this as FuzzySuggestModal<unknown>;
  }

  close(): void {
    this.onClose();
  }

  getItems(): T[] {
    return [];
  }

  getItemText(item: T): string {
    return String(item);
  }

  onChooseItem(_item: T): void {
    // Implemented by subclasses.
  }

  onClose(): void {
    // Implemented by subclasses.
  }
}

export function chooseLatestSuggestion<T>(item: T): void {
  if (!latestFuzzySuggestModal) {
    throw new Error("No FuzzySuggestModal is currently open.");
  }

  latestFuzzySuggestModal.onChooseItem(item);
  latestFuzzySuggestModal.close();
  latestFuzzySuggestModal = null;
}

export function resetObsidianMock(): void {
  latestFuzzySuggestModal = null;
  noticeMessages.length = 0;
}
