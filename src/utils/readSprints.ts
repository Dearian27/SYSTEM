import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { PATHS } from "@/config";
import { normalizeDate } from "@/utils/normalizeDate";
import type { SprintConfig } from "@/types";

export async function readSprints(): Promise<SprintConfig[]> {
  const files = await readdir(PATHS.sprintsDir);
  const mdFiles = files.filter((file) => file.endsWith(".md"));

  const sprints: SprintConfig[] = [];

  for (const fileName of mdFiles) {
    const filePath = path.join(PATHS.sprintsDir, fileName);
    const content = await readFile(filePath, "utf8");
    const parsed = matter(content);

    const data = parsed.data as Partial<SprintConfig>;

    if (!data.name || !data.start || !data.end) continue;

    sprints.push({
      name: data.name,
      start: normalizeDate(data.start),
      end: normalizeDate(data.end),
      capacity:
        typeof data.capacity === "number" && Number.isFinite(data.capacity)
          ? data.capacity
          : undefined,
    });
  }

  return sprints;
}
