import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { PATHS } from "@/config";
import type { TicketFile, TicketFrontmatter } from "@/types";

function normalizeTicketNameFromFileName(fileName: string): string {
  return fileName.replace(/\.md$/, "");
}

export async function readTickets(): Promise<TicketFile[]> {
  const files = await readdir(PATHS.ticketsDir);
  const mdFiles = files.filter((file) => file.endsWith(".md"));

  const tickets: TicketFile[] = [];

  for (const fileName of mdFiles) {
    const filePath = path.join(PATHS.ticketsDir, fileName);
    const content = await readFile(filePath, "utf8");
    const parsed = matter(content);

    tickets.push({
      ticketName: normalizeTicketNameFromFileName(fileName),
      fileName,
      filePath,
      frontmatter: parsed.data as TicketFrontmatter,
    });
  }

  return tickets;
}
