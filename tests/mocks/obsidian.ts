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
