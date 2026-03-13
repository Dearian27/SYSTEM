import { FILE_DATE_REGEX } from "@/config";

export function extractDateFromFileName(fileName: string): string {
  const match = fileName.match(FILE_DATE_REGEX);

  if (!match) {
    throw new Error(`Cannot extract date from file name: ${fileName}`);
  }

  return match[1];
}
